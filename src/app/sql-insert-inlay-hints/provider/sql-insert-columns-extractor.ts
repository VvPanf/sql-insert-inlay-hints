import { ParsedInsert } from '../type/parsed-insert.type';

class SQLInsertColumnsExtractor {
  private SQL_INSERT_PATTERN =
    /INSERT\s+INTO\s+(?:["`\[]?[\w]+["`\]]?)(?:\.["`\[]?[\w]+["`\]]?)?\s*\((.*?)\)\s*VALUES\s*((?:\s*\([^)]+\)\s*,?)+)/gis;

  public *findInserts(text: string): Generator<ParsedInsert> {
    let match: RegExpExecArray | null;
    this.SQL_INSERT_PATTERN.lastIndex = 0;
    const clearedText = this.deleteComments(text);

    while ((match = this.SQL_INSERT_PATTERN.exec(clearedText))) {
      const columnsStr = match[1];
      const valuesGroupStr = match[2];
      const valuesClauseStart = clearedText.toUpperCase().indexOf('VALUES', match.index);
      const valueRowsRegex = /\(([^)]+)\)/g;
      const valueRows: { values: string[]; position: number }[] = [];
      let valueRowMatch: RegExpExecArray | null;
      let searchStartPos = clearedText.indexOf(valuesGroupStr, valuesClauseStart);

      while ((valueRowMatch = valueRowsRegex.exec(valuesGroupStr)) !== null) {
        const rowText = valueRowMatch[0];
        const rowValues = this.parseRowValues(valueRowMatch[1]);
        const rowPosition = clearedText.indexOf(rowText, searchStartPos);

        if (rowPosition !== -1) {
          valueRows.push({
            values: rowValues,
            position: rowPosition + 1,
          });

          searchStartPos = rowPosition + rowText.length;
        }
      }

      yield {
        columns: this.parseColumns(columnsStr),
        valueRows: valueRows,
      };
    }
  }

  private deleteComments(text: string): string {
    const commentPattern = /(--.*$)/gm;
    let match: RegExpExecArray | null;
    let result = text;
    while (match = commentPattern.exec(result)) {
      const comment = match[0];
      result = result.replace(comment, ' '.repeat(comment.length));
    }
    return result
  }

  private parseColumns(columnsStr: string): string[] {
    return columnsStr.split(',').map((col) => col.trim());
  }

  private parseRowValues(valuesStr: string): string[] {
    const values: string[] = [];
    let currentValue = '';
    let inString = false;
    let parenthesesDepth = 0;

    for (const char of valuesStr) {
      if (this.shouldStartNewValue(char, inString, parenthesesDepth)) {
        values.push(currentValue.trim());
        currentValue = '';
        continue;
      }

      parenthesesDepth = this.updateParenthesesDepth(char, inString, parenthesesDepth);
      inString = this.updateStringState(char, inString);
      currentValue += char;
    }

    if (currentValue) {
      values.push(currentValue.trim());
    }

    return values;
  }

  private shouldStartNewValue(char: string, inString: boolean, depth: number): boolean {
    return char === ',' && !inString && depth === 0;
  }

  private updateParenthesesDepth(char: string, inString: boolean, depth: number): number {
    if (inString) {
      return depth;
    } else if (char === '(') {
      return depth + 1;
    } else if (char === ')') {
      return depth - 1;
    }

    return depth;
  }

  private updateStringState(char: string, inString: boolean): boolean {
    return char === "'" ? !inString : inString;
  }
}

export default SQLInsertColumnsExtractor;
