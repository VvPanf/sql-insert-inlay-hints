import * as vscode from 'vscode';
import { ParsedInsert } from '../type/parsed-insert.type';
import SQLInsertColumnsExtractor from './sql-insert-columns-extractor'

class SQLInsertInlayHintsProvider implements vscode.InlayHintsProvider {
  public async provideInlayHints(
    document: vscode.TextDocument,
    range: vscode.Range,
    token: vscode.CancellationToken,
  ): Promise<vscode.InlayHint[]> {
    const text = document.getText();
    const hints: vscode.InlayHint[] = [];
    const extractor = new SQLInsertColumnsExtractor();

    for (const insert of extractor.findInserts(text)) {
      if (token.isCancellationRequested) {
        return hints;
      }

      if (!this.isValidInsert(insert)) {
        continue;
      }

      this.createHintsForInsert(document, insert, hints);
    }

    return hints;
  }

  private isValidInsert(statement: ParsedInsert): boolean {
    if (!statement.valueRows || statement.valueRows.length === 0) {
      return false;
    }

    for (const row of statement.valueRows) {
      if (row.values.length !== statement.columns.length) {
        return false;
      }
    }

    return true;
  }

  private createHintsForInsert(
    document: vscode.TextDocument,
    statement: ParsedInsert,
    hints: vscode.InlayHint[],
  ): void {
    for (const row of statement.valueRows) {
      let currentPos = row.position;

      for (let i = 0; i < statement.columns.length; i++) {
        const value = row.values[i].trim();
        const documentText = document.getText();
        const valuePos = documentText.indexOf(value, currentPos);

        if (valuePos !== -1) {
          const hint = new vscode.InlayHint(
            document.positionAt(valuePos),
            `${statement.columns[i]}: `,
            vscode.InlayHintKind.Parameter,
          );

          hints.push(hint);
          currentPos = valuePos + value.length;
        }
      }
    }
  }
};

export const SQL_INSERT_INLAY_HINTS_PROVIDER = vscode.languages.registerInlayHintsProvider(
  { scheme: 'file', language: 'sql' },
  new SQLInsertInlayHintsProvider(),
);
