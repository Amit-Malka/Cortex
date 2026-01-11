// Patch BigInt to work with JSON.stringify
export const initBigIntSerializer = () => {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
};
