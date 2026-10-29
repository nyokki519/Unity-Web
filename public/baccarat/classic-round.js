import {
  roundTimeline
} from './classic-config.js';
// Source tween choreography; every money/card decision remains in Session.
export function playClassicRound(view, controller) {
  const g = view.g,
    epoch = ++view.roundEpoch,
    round = controller.session.state.round,
    timeline = roundTimeline(round.plan);
  const alive = () => epoch === view.roundEpoch && controller.session.state.round?.id === round.id;
  const later = (ms, fn) => g.time.events.add(view.reduced ? 0 : ms, () => {
    if (alive()) fn();
  });
  const move = (index, delay, done) => {
    const c = timeline.cards[index],
      card = view.card(c.card, c.fromX, c.fromY);
    view.cards.push(card);
    if (view.reduced) {
      card.position.set(c.x, c.y);
      while (controller.session.state.round.revealed <= index) controller.session.reveal();
      done();
      return;
    }
    const tween = g.add.tween(card).to({
      x: c.x,
      y: c.y
    }, c.duration, Phaser.Easing.Cubic.Out, true, delay);
    tween.onStart.add(() => {
      if (alive()) view.sound('card_send');
    });
    tween.onComplete.add(() => {
      if (!alive()) return;
      while (controller.session.state.round.revealed <= index) controller.session.reveal();
      done();
    });
  };
  const result = () => {
    if (!alive() || controller.session.state.round.paid) return;
    try {
      controller.session.revealAll();
      controller.settle();
      view.showResult();
      later(timeline.promptDelay, () => view.askRepeat());
    } catch (error) {
      view.error(error);
      view.retrySettlement = result;
    }
  };
  const third = index => {
    if (index >= round.plan.cards.length) {
      view.handPoints(round.plan.cards.length);
      later(timeline.wait, result);
      return;
    }
    move(index, 0, () => {
      third(index + 1);
    });
  };
  const opening = index => {
    if (index === 4) {
      view.handPoints(4);
      later(timeline.wait, () => {
        if (round.plan.cards.length === 4) result();
        else third(4);
      });
      return;
    }
    move(index, timeline.openingDelay, () => opening(index + 1));
  };
  view.clearCards();
  view.resetResult();
  view.setBetting(false);
  view.handPoints(0);
  view.currency();
  view.moneyMotion(-Object.values(round.bets).reduce((a, b) => a + b, 0));
  opening(0);
}
