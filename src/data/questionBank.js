// 内蔵問題バンク(APIクレジットを消費せずに出題するための事前作成問題)
// 基本は各カテゴリ90問(やさしい/標準/むずかしい 各30問)。
// これにシラバス対応の補強問題を加え、合計658問。
//
// 問題データは約8500行と大きいため、動的import(コード分割)で遅延読み込みする。
// これによりメインのJSバンドルが軽くなり、ホーム/設定/用語集などの初期表示が速くなる。
// 一度読み込んだら以降は同じ配列を使い回す(キャッシュ)。

let cache = null;
let loading = null;

export async function loadQuestionBank() {
  if (cache) return cache;
  // 同時に複数回呼ばれても import は1回だけにする
  if (!loading) {
    loading = Promise.all([
      import("./questions/ml.js"),
      import("./questions/dl.js"),
      import("./questions/math.js"),
      import("./questions/hist.js"),
      import("./questions/law.js"),
      import("./questions/eth.js"),
      import("./questions/biz.js"),
    ]).then(([ml, dl, math, hist, law, eth, biz]) => {
      cache = [
        ...ml.ML_QUESTIONS,
        ...dl.DL_QUESTIONS,
        ...math.MATH_QUESTIONS,
        ...hist.HIST_QUESTIONS,
        ...law.LAW_QUESTIONS,
        ...eth.ETH_QUESTIONS,
        ...biz.BIZ_QUESTIONS,
      ];
      loading = null;
      return cache;
    });
  }
  return loading;
}
