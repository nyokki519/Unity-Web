import test from 'node:test';
import assert from 'node:assert/strict';
import {toastMessage} from '../public/js/dom.js';

test('toast messages never stringify object payloads as [object Object]',()=>{
 assert.equal(toastMessage({message:'通信が切れました'}),'応答を確認できませんでした。通信状態を確認してください。');
 assert.equal(toastMessage('通信が切れました'),'通信が切れました');
 assert.equal(toastMessage(new Error('失敗しました')),'失敗しました');
});
