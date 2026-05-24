export const createAnimatedCounter = (
  onUpdate: (value: number) => void,
  increment: number = 5
) => {
  let animationFrame: number;
  let currentValue = 0;
  let targetValue = 0;

  const animate = () => {
    if (currentValue < targetValue) {
      currentValue = Math.min(currentValue + increment, targetValue);
      onUpdate(currentValue);
      if (currentValue < targetValue) {
        animationFrame = requestAnimationFrame(animate);
      }
    }
  };

  const setTarget = (target: number) => {
    targetValue = target;
    animate();
  };

  const stop = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
  };

  return { setTarget, stop };
};
