export * from './cpu';

export const bitSet = (value: number, bit: number, set: boolean) => {
  return set ? value | (1 << bit) : value & ~(1 << bit);
};

export const bitGet = (value: number, bit: number): 0 | 1  => {
  return (value & (1 << bit)) !== 0 ? 1 : 0;
};

export const bitTest = (value: number, bit: number): boolean => {
  return (value & (1 << bit)) !== 0;
};
