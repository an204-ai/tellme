import assert from 'node:assert/strict';
import { authDestination } from '../src/lib/auth-navigation.ts';
assert.equal(authDestination('/community/messages/abc?x=1'), '/community/messages/abc?x=1');
for (const value of [null, '', '//outside.example', '/\\outside.example', 'https://outside.example', '/auth/login', '/community/../../auth/login', '/community-evil']) assert.equal(authDestination(value), '/community/today');
console.log('PASS: post-login navigation stays inside the app, including browser-normalized paths.');
