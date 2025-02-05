export const bitSet = (value: number, bit: number, set: boolean) => {
  return set ? value | (1 << bit) : value & ~(1 << bit);
};
