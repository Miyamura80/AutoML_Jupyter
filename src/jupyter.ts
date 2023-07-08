import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { generateCode } from './api';

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
  
  let foundMarkdown = false;
  for (let i = 0; i < notebook.cells.length; i++) {
    if (notebook.cells[i].cell_type === 'markdown') {
      foundMarkdown = true;
      continue;
    }

    if (foundMarkdown && notebook.cells[i].cell_type === 'code') {
      const cellContent = notebook.cells[i].source.join('').trim();
      if (!cellContent) {
        notebook.cells[i].source = ["print(\"hello world\")"];
      }
      break;
    }
  }

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