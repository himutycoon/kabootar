// Android hardware-back support for overlays. Open sheets/dialogs register a
// close handler; the global back handler closes the top-most one before it
// falls back to router navigation.
const stack = [];

export function pushBackHandler(fn) {
  stack.push(fn);
  return () => {
    const i = stack.lastIndexOf(fn);
    if (i >= 0) stack.splice(i, 1);
  };
}

export function handleBackOverlay() {
  const fn = stack[stack.length - 1];
  if (!fn) return false;
  fn();
  return true;
}
