// Resolves once the intro loader sheet starts lifting away.
let lifted = false;
let waiters = [];

export const announceLift = () => {
  if (lifted) return;
  lifted = true;
  waiters.forEach((resolve) => resolve());
  waiters = [];
};

export const whenLifted = () =>
  lifted ? Promise.resolve() : new Promise((resolve) => waiters.push(resolve));
