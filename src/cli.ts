#!/usr/bin/env node

import { run } from './app.js';

process.exitCode = await run(process.argv.slice(2));
