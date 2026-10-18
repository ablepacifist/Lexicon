#!/usr/bin/env node
// Syncs the one-registry destinations doc into files the build can import.
//
// Layering (lowest -> highest priority):
//   1. src/config/destinations.defaults.json (committed, standalone defaults
//      so this app runs and builds on its own when cloned by itself)
//   2. whitelisted keys found in the master root .env (MASTER_ENV_FILE env
//      var, else walking up from this app's directory for a .env that also
//      contains a LAN_HOST= line; ignored silently if not found)
//   3. real process environment variables for those same keys (highest)
//
// Writes the merged result to:
//   - src/config/destinations.json   (imported by app code)
//   - public/destinations.json       (fetchable by the service worker, which
//                                      cannot import modules)
// Both are git-ignored/generated, and are only rewritten when their content
// actually changes, so their mtimes stay meaningful for the launcher's
// "rebuild if config is newer than build" check.
//
// Plain Node, zero dependencies, cross-platform.
'use strict';

const fs = require('fs');
const path = require('path');

const APP_ROOT = path.join(__dirname, '..');
const DEFAULTS_PATH = path.join(APP_ROOT, 'src', 'config', 'destinations.defaults.json');
const OUT_SRC = path.join(APP_ROOT, 'src', 'config', 'destinations.json');
const OUT_PUBLIC = path.join(APP_ROOT, 'public', 'destinations.json');

// Only these keys may ever reach the shipped bundle - see the root
// .env.example "SHIPPED TO CLIENTS" note. Never add a secret key here.
const WHITELIST = [
    'LAN_HOST', 'ALISON_LAN_IP', 'FRONTEND_PORT', 'LEXICON_PORT', 'ALCHEMY_PORT',
    'POKEMON_PORT', 'BRAIN_LAN_PORT', 'PUBLIC_FRONTEND_URL', 'PUBLIC_LEXICON_URL',
    'PUBLIC_ALCHEMY_URL', 'PUBLIC_POKEMON_URL', 'PUBLIC_BRIDGE_URL', 'PUBLIC_BRAIN_URL',
    'PLAYIT_HOST', 'PLAYIT_FRONTEND_PORT', 'PLAYIT_ALCHEMY_PORT', 'PLAYIT_LEXICON_PORT',
    'PLAYIT_POKEMON_PORT',
];

/** Tiny .env parser: KEY=value, skip comments/blank lines, strip optional quotes. */
function parseEnvFile(content) {
    const out = {};
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        out[key] = value;
    }
    return out;
}

/** MASTER_ENV_FILE if set and present, else walk up from this app looking for a master .env. */
function findMasterEnvFile() {
    if (process.env.MASTER_ENV_FILE) {
        return fs.existsSync(process.env.MASTER_ENV_FILE) ? process.env.MASTER_ENV_FILE : null;
    }
    let dir = APP_ROOT;
    for (let i = 0; i < 8; i++) {
        const candidate = path.join(dir, '.env');
        if (fs.existsSync(candidate)) {
            try {
                const content = fs.readFileSync(candidate, 'utf8');
                if (/^LAN_HOST=/m.test(content)) return candidate;
            } catch {
                /* unreadable - keep walking */
            }
        }
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return null;
}

function loadDefaults() {
    return JSON.parse(fs.readFileSync(DEFAULTS_PATH, 'utf8'));
}

/** Write only when content differs, so mtimes stay meaningful. Returns whether it wrote. */
function writeIfChanged(filePath, contents) {
    if (fs.existsSync(filePath)) {
        if (fs.readFileSync(filePath, 'utf8') === contents) return false;
    } else {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }
    fs.writeFileSync(filePath, contents);
    return true;
}

function main() {
    const merged = loadDefaults();

    const masterEnvPath = findMasterEnvFile();
    if (masterEnvPath) {
        const parsed = parseEnvFile(fs.readFileSync(masterEnvPath, 'utf8'));
        for (const key of WHITELIST) {
            if (Object.prototype.hasOwnProperty.call(parsed, key)) {
                merged[key] = parsed[key];
            }
        }
    }

    for (const key of WHITELIST) {
        if (Object.prototype.hasOwnProperty.call(process.env, key)) {
            merged[key] = process.env[key];
        }
    }

    // Only ever emit whitelisted keys, in a fixed order - never pass through
    // anything else that might have been present in defaults.json.
    const out = {};
    for (const key of WHITELIST) {
        out[key] = merged[key];
    }

    const contents = JSON.stringify(out, null, 2) + '\n';
    const wroteSrc = writeIfChanged(OUT_SRC, contents);
    const wrotePublic = writeIfChanged(OUT_PUBLIC, contents);

    if (wroteSrc || wrotePublic) {
        console.log(
            '[sync-destinations] wrote destinations.json (' +
            (masterEnvPath ? 'overlaid from ' + masterEnvPath : 'defaults only') +
            ')'
        );
    }
}

main();
