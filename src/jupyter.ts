import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const genCodeEndpoint = 'http://localhost:8080/code';
const sumCodeEndpoint = 'http://localhost:8080/summarize';

export async function jupyter(): Promise<void> {

  // Make sure a text editor is active
  if (!vscode.window.activeTextEditor) {
    console.log("No active text editor found");
    return;
  }

  // Get the active document
  const document = vscode.window.activeTextEditor?.document;

  const notebook: any = parseDocumentToJson(document!);

  console.log("Printing notebook:");
  console.log(notebook);

  /*
  === NOTEBOOK STRUCTURE ===
  */

  // Find the first markdown cell that begins with the string "!auto-jupyter" and if none found, return
  const firstMarkdownCell = notebook.cells.find((cell: any) => {
    return cell.cell_type === 'markdown' && cell.source[0].trim().startsWith('!auto-jupyter');
  });
  if (!firstMarkdownCell) {
    console.log("No markdown cell found");
    return;
  }

  console.log("Found markdown cell with !auto-jupyter, executing...");

  // Check if the next cell is a blank code cell and if not, insert a new code cell
  const blankCodeCell = {
    cell_type: 'code',
    execution_count: null,
    metadata: {},
    outputs: [],
    source: [],
  }
  if (notebook.cells.indexOf(firstMarkdownCell) === notebook.cells.length - 1) {
    notebook.cells.push(blankCodeCell);
  } else if (notebook.cells[notebook.cells.indexOf(firstMarkdownCell) + 1].cell_type !== 'code') {
    // TODO: This overrwrites the next cell, but we should insert a new cell instead
    notebook.cells.splice(notebook.cells.indexOf(firstMarkdownCell) + 1, 0, blankCodeCell)
  } 

  // Get the text after the "!auto-jupyter" string
  const command = firstMarkdownCell.source[0].trim().split(' ').slice(1).join(' ');
  
  // Post the command to the endpoint and catch errors
  const temperature = 0.5;
  let codeOutput: any;
  let codeSummary: any;
  try {
    console.log(`Posting command to endpoint... Command: ${command}`);
    codeOutput = (await axios.post(genCodeEndpoint, {prompt: command, temperature: temperature})).data.response.choices[0].message.content;
    console.log(`Code output: ${codeOutput}`);
    codeSummary = (await axios.post(sumCodeEndpoint, {prompt: codeOutput, temperature: temperature})).data.response.choices[0].message.content;
    console.log(`Code summary: ${codeSummary}`);
  } catch (error: any) {
    console.error("Error posting command to endpoint");
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    } else if (error.request) {
      console.error("Request data:", error.request);
    } else {
      console.error("Other error:", error.message);
    }
    return;
  }

  console.log("Successfully posted command to endpoint, writing to file...");
  console.log("=============================================================");
  // Insert the codeOutput into the code cell
  notebook.cells[notebook.cells.indexOf(firstMarkdownCell) + 1].source = codeOutput;

  // Replace the markdown cell text with the codeSummary
  notebook.cells[notebook.cells.indexOf(firstMarkdownCell)].source = codeSummary;

  const newFileContent = JSON.stringify(notebook, null, 2);
  fs.writeFileSync(document.uri.fsPath, newFileContent, 'utf8');
}


const parseDocumentToJson = (document: vscode.TextDocument) => {
  // Make sure a document is open
  if (!document) {
    console.log("No active document found");
    return;
  }

  // Read the entire file content
  let fileContent: string;
  try {
    fileContent = fs.readFileSync(document.uri.fsPath, 'utf8');
  } catch (err) {
    console.error(`Error reading file: ${err}`);
    return;
  }

  // Parse the content as JSON
  let notebook: any;
  try {
    notebook = JSON.parse(fileContent);
  } catch (err) {
    console.error(`Error parsing JSON: ${err}`);
    return;
  }
  return notebook;
}