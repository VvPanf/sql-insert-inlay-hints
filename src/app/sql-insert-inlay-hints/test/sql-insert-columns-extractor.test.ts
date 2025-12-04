import SQLInsertColumnsExtractor from '../provider/sql-insert-columns-extractor';

describe('SqlParser', () => {
  const extractor = new SQLInsertColumnsExtractor();

  it('should parse simple SQL query with two columns and values', () => {
    const sqlQuery = "INSERT INTO table_name (column1, column2) VALUES ('value1', 'value2')";
    const result = extractor.findInserts(sqlQuery).next();
    expect(result.value).toEqual({
      columns: ['column1', 'column2'],
      valueRows: [
        {
          values: ["'value1'", "'value2'"],
          position: 50,
        },
      ],
    });
  });

  it('should parse simple SQL query with lowercase letters', () => {
    const sqlQuery = "insert into table_name (column1, column2) values ('value1', 'value2')";
    const result = extractor.findInserts(sqlQuery).next();
    expect(result.value).toEqual({
      columns: ['column1', 'column2'],
      valueRows: [
        {
          values: ["'value1'", "'value2'"],
          position: 50,
        },
      ],
    });
  });

  it('should parse simple SQL query with no string values', () => {
    const sqlQuery = "INSERT INTO table_name (column1, column2, column3) VALUES (123, true, 4.56)";
    const result = extractor.findInserts(sqlQuery).next();
    expect(result.value).toEqual({
      columns: ['column1', 'column2', 'column3'],
      valueRows: [
        {
          values: ["123", "true", "4.56"],
          position: 59,
        },
      ],
    });
  });

  it('should parse simple SQL query with shielded table name', () => {
    const sqlQuery = "INSERT INTO \`table_name\` (column1, column2) VALUES ('value1', 'value2')";
    const result = extractor.findInserts(sqlQuery).next();
    expect(result.value).toEqual({
      columns: ['column1', 'column2'],
      valueRows: [
        {
          values: ["'value1'", "'value2'"],
          position: 52,
        },
      ],
    });
  });

  it('should parse simple SQL query with quotes shielded table name', () => {
    const sqlQuery = "INSERT INTO \"table_name\" (column1, column2) VALUES ('value1', 'value2')";
    const result = extractor.findInserts(sqlQuery).next();
    expect(result.value).toEqual({
      columns: ['column1', 'column2'],
      valueRows: [
        {
          values: ["'value1'", "'value2'"],
          position: 52,
        },
      ],
    });
  });

  it('should parse simple SQL query with square bracket shielded table name', () => {
    const sqlQuery = "INSERT INTO [table_name] (column1, column2) VALUES ('value1', 'value2')";
    const result = extractor.findInserts(sqlQuery).next();
    expect(result.value).toEqual({
      columns: ['column1', 'column2'],
      valueRows: [
        {
          values: ["'value1'", "'value2'"],
          position: 52,
        },
      ],
    });
  });

  it('should parse simple SQL query with schema name and table name', () => {
    const sqlQuery = "INSERT INTO schema_name.table_name (column1, column2) VALUES ('value1', 'value2')";
    const result = extractor.findInserts(sqlQuery).next();
    expect(result.value).toEqual({
      columns: ['column1', 'column2'],
      valueRows: [
        {
          values: ["'value1'", "'value2'"],
          position: 62,
        },
      ],
    });
  });

  it('should parse simple SQL query with shielded schema name and table name', () => {
    const sqlQuery = "INSERT INTO \"schema_name\".\"table_name\" (column1, column2) VALUES ('value1', 'value2')";
    const result = extractor.findInserts(sqlQuery).next();
    expect(result.value).toEqual({
      columns: ['column1', 'column2'],
      valueRows: [
        {
          values: ["'value1'", "'value2'"],
          position: 66,
        },
      ],
    });
  });

  it('should parse SQL query with two columns and many rows', () => {
    const sqlQuery = "INSERT INTO table_name (column1, column2) VALUES ('value1', 'value2'), ('value3', 'value4')";
    const extractor = new SQLInsertColumnsExtractor();
    const result = extractor.findInserts(sqlQuery).next();
    expect(result.value).toEqual({
      columns: ['column1', 'column2'],
      valueRows: [
        {
          values: ["'value1'", "'value2'"],
          position: 50,
        },
        {
          values: ["'value3'", "'value4'"],
          position: 72,
        },
      ]
    });
  });

  it('should parse SQL query with two columns and many rows multiline', () => {
    const sqlQuery = `
    INSERT INTO 
        table_name (column1, column2) 
    VALUES 
    ('value1', 'value2'), 
    ('value3', 'value4')
    `;
    const extractor = new SQLInsertColumnsExtractor();
    const result = extractor.findInserts(sqlQuery).next();
    expect(result.value).toEqual({
      columns: ['column1', 'column2'],
      valueRows: [
        {
          values: ["'value1'", "'value2'"],
          position: 74,
        },
        {
          values: ["'value3'", "'value4'"],
          position: 101,
        },
      ]
    });
  });

  it('should parse SQL query with two columns and many rows multiline with comments', () => {
    const sqlQuery = `
    INSERT INTO table_name (
          column1,   -- description of column 1
          column2    -- description of column 2
    ) VALUES 
    ('value1', 'value2'), 
    ('value3', 'value4')
    `;
    const extractor = new SQLInsertColumnsExtractor();
    const result = extractor.findInserts(sqlQuery).next();
    expect(result.value).toEqual({
      columns: ['column1', 'column2'],
      valueRows: [
        {
          values: ["'value1'", "'value2'"],
          position: 145,
        },
        {
          values: ["'value3'", "'value4'"],
          position: 172,
        },
      ]
    });
  });

  it('should parse many SQL queries with two columns and values', () => {
    const sqlQuery = `
    INSERT INTO table_name (column1, column2) VALUES ('value1', 'value2');
    INSERT INTO table_name (column3, column4) VALUES ('value3', 'value4');
    INSERT INTO table_name (column5, column6) VALUES ('value5', 'value6');
    `;
    const inserts = extractor.findInserts(sqlQuery);
    const result1 = inserts.next();
    expect(result1.value).toEqual({
      columns: ['column1', 'column2'],
      valueRows: [
        {
          values: ["'value1'", "'value2'"],
          position: 55,
        },
      ],
    });
    const result2 = inserts.next();
    expect(result2.value).toEqual({
      columns: ['column3', 'column4'],
      valueRows: [
        {
          values: ["'value3'", "'value4'"],
          position: 130,
        },
      ],
    });
    const result3 = inserts.next();
    expect(result3.value).toEqual({
      columns: ['column5', 'column6'],
      valueRows: [
        {
          values: ["'value5'", "'value6'"],
          position: 205,
        },
      ],
    });
  });

});
