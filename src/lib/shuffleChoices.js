// 出題時に選択肢の並びをシャッフルする。
// 内蔵問題は正解が選択肢Aに偏っているため(作成時の癖)、
// 並びを毎回ランダム化して位置から正解を推測できないようにする。
export function shuffleChoices(question) {
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...question,
    choices: order.map((i) => question.choices[i]),
    answerIndex: order.indexOf(question.answerIndex),
  };
}
