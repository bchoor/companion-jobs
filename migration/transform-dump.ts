#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const dumpPath = resolve(import.meta.dir, "sqlite-dump.sql");
const outputPath = resolve(import.meta.dir, "d1-import.sql");

console.log("Reading SQLite dump...");
const sql = readFileSync(dumpPath, "utf-8");

console.log("Transforming SQL for D1...");

// Split into lines for processing
const lines = sql.split("\n");
const transformedLines: string[] = [];

let insideJobsCreate = false;
let createTableBuffer: string[] = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Skip D1-incompatible pragmas, transactions, and sqlite_sequence
  if (
    line.startsWith("PRAGMA") ||
    line === "BEGIN TRANSACTION;" ||
    line === "COMMIT;" ||
    line.includes("sqlite_sequence")
  ) {
    continue;
  }

  // Change CREATE TABLE to CREATE TABLE IF NOT EXISTS
  if (line.startsWith("CREATE TABLE ")) {
    transformedLines.push(line.replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS "));
    continue;
  }

  // Change CREATE INDEX to CREATE INDEX IF NOT EXISTS
  if (line.startsWith("CREATE INDEX ")) {
    transformedLines.push(line.replace("CREATE INDEX ", "CREATE INDEX IF NOT EXISTS "));
    continue;
  }

  // Detect CREATE TABLE jobs
  if (line.includes("CREATE TABLE") && line.includes("jobs")) {
    insideJobsCreate = true;
    createTableBuffer = [line];
    continue;
  }

  // Buffer lines inside CREATE TABLE jobs
  if (insideJobsCreate) {
    createTableBuffer.push(line);
    if (line.includes(");")) {
      // End of CREATE TABLE - modify it
      const modifiedCreate = createTableBuffer.join("\n").replace(
        /updated_at\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+\(datetime\('now'\)\)/,
        `updated_at      TEXT NOT NULL DEFAULT (datetime('now')),\n  type            TEXT NOT NULL DEFAULT 'scrape'`
      );
      transformedLines.push(modifiedCreate);
      insideJobsCreate = false;
      createTableBuffer = [];
      continue;
    }
    continue;
  }

  // Transform INSERT INTO jobs statements to include type='scrape'
  if (line.startsWith("INSERT INTO jobs")) {
    // Parse the INSERT statement
    const match = line.match(/INSERT INTO jobs VALUES\((.*)\);/);
    if (match) {
      const values = match[1];
      // Add 'scrape' as the last value before the closing parenthesis
      const modifiedLine = `INSERT INTO jobs VALUES(${values},'scrape');`;
      transformedLines.push(modifiedLine);
      continue;
    }
  }

  transformedLines.push(line);
}

const transformedSql = transformedLines.join("\n");

console.log("Writing transformed SQL...");
writeFileSync(outputPath, transformedSql, "utf-8");

console.log(`✅ Transformation complete: ${outputPath}`);
