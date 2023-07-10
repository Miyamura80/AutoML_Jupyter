import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ServerConnection, Kernel, ServiceManager } from '@jupyterlab/services';
import { spawn } from 'child_process';
import { URL } from 'url';
import axios, { AxiosResponse } from 'axios';

const genCodeEndpoint = 'http://localhost:8080/code';


export const jupyter = async () => {
  await readFirstMarkdownCell();
};

export async function initialWrite(code: string): Promise<void> {
  console.log('dummy write');
}

export async function readFirstMarkdownCell(): Promise<void> {

  // Make sure a text editor is active
  if (!vscode.window.activeTextEditor) {
    console.log("No active text editor found");
    return;
  }

  const document = vscode.window.activeTextEditor?.document;
  const editorPath = vscode.window.activeTextEditor.document.uri.fsPath;
  // const editorDir = vscode.workspace.getWorkspaceFolder(document.uri);
  const editorDir = path.dirname(editorPath);
  const notebook: any = parseDocumentToJson(document!);

  console.log("Printing notebook:");
  console.log(notebook);

  console.log("Server connection");
  // Start a new Jupyter server
  let jupyter = await spawn('jupyter', ['notebook', '--no-browser'], { cwd: editorDir });

  let baseUrl: string | undefined;
  let token: any;
  // Handle output - for some weird reason, it runs on stderr
  jupyter.stderr.on('data', data => {
    let output = data.toString();
    console.log('INIT SEQUENCE:', output);

    // Parse output for URL and token
    let urlMatch = output.match(/http:\/\/localhost:\d+\/\?token=\w+/);
    if (urlMatch) {
      let url = new URL(urlMatch[0]);
      baseUrl = url.origin;
      token = url.searchParams.get('token');
      console.log('INIT SEQUENCE - Jupyter server base URL:', baseUrl);
      console.log('INIT SEQUENCE - Jupyter server token:', token);

      // Call the openAndExecuteCell function after getting the token
      // openAndExecuteCell(baseUrl, token, notebook, editorPath);
    }
  });

  // Handle stdout
  jupyter.stdout.on('data', data => {
    console.log('Jupyter Server threw stout:', data.toString());
  });

  // Check if the process exited normally
  jupyter.on('exit', code => {
    console.log("process exited")
    if (code !== 0) {
      console.log(`Jupyter Eito process exited with code ${code}`);
    }
  });

  console.log("Server connection");
  // Create a server settings object
  let serverSettings: ServerConnection.ISettings = ServerConnection.makeSettings({
    baseUrl: baseUrl,
    token: token,
  });

  console.log("Server connection object created");
  // Create a service manager
  let manager: ServiceManager.IManager = new ServiceManager({ serverSettings });

  console.log("Created manager object");

  // Start a new kernel
  let model: Kernel.IModel;
  manager.kernelspecs.ready.then(() => {
    manager.kernels.startNew({ name: 'python3' })  // Change 'python3' to the name of your kernel
      .then(kernel => {
        model = kernel.model;
        console.log('Kernel started:', kernel.id);
      })
      .catch(err => {
        console.error('Failed to start kernel:', err);
      });
  });

  console.log("Kernel started");

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
    notebook.cells.splice(notebook.cells.indexOf(firstMarkdownCell) + 1, 0, blankCodeCell);
  } 

  // Get the text after the "!auto-jupyter" string
  const command = firstMarkdownCell.source[0].trim().split(' ').slice(1).join(' ');
  
  // Post the command to the endpoint and catch errors
  let response: any;
  const temperature = 0.5;
  
  try {
    console.log(`Posting command to endpoint... Command: ${command}`);
    response = (await axios.post(genCodeEndpoint, {prompt: command, temperature: temperature}));
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

  const codeOutput = response.data.response.choices[0].message.content;
  console.log("Successfully posted command to endpoint, writing to file...");
  console.log("=============================================================");
  // TODO: Check if there is empty code
  // TODO: Delete !auto-jupyter line
  // Insert the body of the result into the code cell
  notebook.cells[notebook.cells.indexOf(firstMarkdownCell) + 1].source = codeOutput;

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


// async function openAndExecuteCell(baseUrl: string, token: string | null, notebook: any, editorPath: string): Promise<void> {
//   try {

//     // 1. Create a new session
//     console.log('CREATE SESSION - Creating session...');
//     let response = await axios.post(
//       `${baseUrl}/api/sessions`,
//       {
//         notebook: { path: editorPath }, // replace with your notebook file path
//         kernel: { name: 'python3' } // replace with your kernel name
//       },
//       {
//         headers: { Authorization: `token ${token}` },
//       }
//     );
//     console.log('CREATE SESSION - Session created:', response.data);

//     const sessionId = response.data.id;

//     // 2. Execute code in the newly created session
//     const code = 'print("Hello, World!")'; // replace with the code of the cell you want to execute

//     response = await axios.post(
//       `${baseUrl}/api/sessions/${sessionId}/execute`,
//       { code },
//       {
//         headers: { Authorization: `token ${token}` },
//       }
//     );

//     console.log('EXECUTE CODE - Code executed:', response.data);

//   } catch (error: any) {
//       console.error('Error executing cell:', error);
//       console.error(error.arg1.stack);
//   }
// }
