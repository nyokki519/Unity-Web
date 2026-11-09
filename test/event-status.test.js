import test from 'node:test';
import assert from 'node:assert/strict';
import {acknowledgementMessage} from '../public/js/events/status.js';

test('event acknowledgements describe the action that was accepted',()=>{
 assert.equal(acknowledgementMessage('event_begin'),'回答時間が始まりました。');
 assert.equal(acknowledgementMessage('event_answer'),'回答を受け付けました。');
 assert.equal(acknowledgementMessage('event_reveal'),'回答を公開しました。');
 assert.equal(acknowledgementMessage('event_next'),'次のお題へ進みます。');
 assert.equal(acknowledgementMessage('event_unknown'),'操作を受け付けました。');
});
