export const cardVariants = {
  hidden:  { opacity: 0, scale: 0.95, y: 6 },
  visible: { opacity: 1, scale: 1,    y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
};

export const gridVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.04 } },
};
