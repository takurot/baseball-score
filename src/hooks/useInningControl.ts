export const useInningControl = () => {
  const getNextGameState = (
    currentOuts: number,
    isOut: boolean,
    currentInning: number,
    isTop: boolean
  ) => {
    if (isOut) {
      const newOuts = currentOuts + 1;
      if (newOuts >= 3) {
        // 3アウトチェンジ
        return {
          outs: 0,
          inning: isTop ? currentInning : currentInning + 1,
          isTop: !isTop,
          runners: { first: false, second: false, third: false },
        };
      }
      return {
        outs: newOuts,
        inning: currentInning,
        isTop,
        runners: null, // ランナー状態は変更しない
      };
    }
    return {
      outs: currentOuts,
      inning: currentInning,
      isTop,
      runners: null, // ランナー状態は変更しない
    };
  };

  const isGameEnd = (inning: number, isTop: boolean) => {
    // 少年野球なので最大7回まで
    const maxInning = 7;
    return inning > maxInning || (inning === maxInning && !isTop);
  };

  return { getNextGameState, isGameEnd };
};
