import * as vscode from 'vscode';

export const jupyter = () => {

  // Access to currently active editor
  const {
    activeTextEditor: { document },
  } = vscode.window;

  // Allow textual changes in the document
  const workspaceEdit = new vscode.WorkspaceEdit();

  // Get console logs and filter it
  const logs = getConsoleLogs(document);
  logs
    .filter(log => log.badWordsCount > 0)
    .forEach(log => {
      workspaceEdit.replace(document.uri, log.range, log.purified);
    });

  // Left fold of the sum
  const badWordsCount = logs.reduce(
    (sum, log) => sum + log.badWordsCount,
    0
  );

  vscode.workspace.applyEdit(workspaceEdit).then(() => {
    badWordsCount
      ? vscode.window.showInformationMessage(
          `Number of bad words that were censored: ${badWordsCount} 🤬🤬🤬🤬`
        )
      : vscode.window.showInformationMessage(
          'No bad words! 😇😇😇😇'
        );
    document.save();
  });
};

const logRegex = /console\s*\.\s*log\([\s\S]*?\);/g;

// For each console log, returns object consisting of
// number of bad words, purified version, and vscode.Range
const getConsoleLogs = (
  document: vscode.TextDocument
): Array<{
  range: vscode.Range;
  purified: string;
  badWordsCount: number;
}> => {
  const documentText = document.getText();
  let logStatements = [];

  let match;
  while ((match = logRegex.exec(documentText))) {
    const matchRange = new vscode.Range(
      document.positionAt(match.index),
      document.positionAt(match.index + match[0].length)
    );
    const [purified, badWordsArray] = purify(match[0]);
    logStatements.push({
      purified,
      badWordsCount: badWordsArray.length,
      range: matchRange,
    });
  }
  return logStatements;
};