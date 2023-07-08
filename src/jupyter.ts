import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const genCodeEndpoint = 'http://localhost:8080/code';

export const jupyter = async () => {

  await readFirstMarkdownCell();

};

export async function initialWrite(code: string): Promise<void> {
  console.log('dummy write')
}

export async function readFirstMarkdownCell(): Promise<void> {

  // Make sure a text editor is active
  if (!vscode.window.activeTextEditor) {
    console.log("No active text editor found");
    return;
  }

  // Get the active document
  const document = vscode.window.activeTextEditor?.document;

  const notebook: any = parseDocumentToJson(document!);

  console.log(notebook);
  
  // Find the first markdown cell that begins with the string "!auto-jupyter" and if none found, return
  const firstMarkdownCell = notebook.cells.find((cell: any) => {
    return cell.cell_type === 'markdown' && cell.source[0].trim().startsWith('!auto-jupyter');
  });
  if (!firstMarkdownCell) {
    console.log("No markdown cell found");
    return;
  }

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
    notebook.cells.splice(notebook.cells.indexOf(firstMarkdownCell) + 1, 0, blankCodeCell);
  } 

  // Get the text after the "!auto-jupyter" string
  const command = firstMarkdownCell.source[0].trim().split(' ')[1];


  // TODO: Delete this bit
  notebook.cells[notebook.cells.indexOf(firstMarkdownCell) + 1].source = 'example code';
  return;
  
  // Post the command to the endpoint and catch errors
  let response: string;
  try {
    response = (await axios.post(genCodeEndpoint, command)).data.result;
  } catch (err) {
    console.error(`Error posting to endpoint: ${err}`);
    return;
  }

  // Insert the body of the result into the code cell
  notebook.cells[notebook.cells.indexOf(firstMarkdownCell) + 1].source = response;

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