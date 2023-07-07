import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export const jupyter = async () => {

  await readFirstMarkdownCell();

};

async function readFirstMarkdownCell(): Promise<void> {

  // Make sure a text editor is active
  if (!vscode.window.activeTextEditor) {
    console.log("No active text editor found");
    return;
  }

  // Get the active document
  const document = vscode.window.activeTextEditor?.document;

  const notebook: any = parseDocumentToJson(document!);


  console.log(notebook);
  // Traverse through the cells array
  for (let cell of notebook.cells) {
    // If this cell is a markdown cell
    if (cell.cell_type === 'markdown') {
      // Log the cell's content to the console and return
      console.log(cell.source.join(''));
      return;
    }
  }

  // If we reached this point, there were no markdown cells in the notebook
  console.log('No markdown cells found');
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