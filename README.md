# Hexa Shoot Arena — HTML版 v0.1

GitHub Pagesへそのままアップロードできる、依存関係なしのHTML/CSS/JavaScript版です。

## ファイル

- `index.html`
- `style.css`
- `game.js`
- `SPEC.md`

## 公開方法

1. このフォルダの中身をGitHubリポジトリ直下へアップロード
2. GitHubの `Settings`
3. `Pages`
4. `Deploy from a branch`
5. Branchを `main`、Folderを `/ (root)` に設定
6. `Save`

npm、Node.js、Viteは不要です。

## 現在の実装

- 5チーム
- 試合時間1分／2分
- 六角形コート
- ゴール横の内向きカーブ壁
- 8方向移動
- ゴロパス／浮き玉パス
- ストレート／回転シュート
- 壁反射
- ボールの自然減速
- 人に当たると横へ弱くこぼれる
- 弱い球のトラップ
- キーパー自動帰還
- 簡易CPU
- 6秒ルール
- 浮き球への自動ボレー
