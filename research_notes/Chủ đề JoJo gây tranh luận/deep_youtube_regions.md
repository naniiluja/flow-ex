# Video JoJo trên YouTube theo vùng (Mỹ, Nhật, Hàn, Đài Loan/Hồng Kông): góc nào thắng, bình luận cãi gì

Phương pháp: YouTube Data API v3, đọc ngày **30/10/2026**. `search.list` (order viewCount, publishedAfter 2025-10-01, regionCode + relevanceLanguage theo vùng; một số lượt lọc `videoDuration` medium/long), rồi `videos.list` lấy view/like/bình luận/thời lượng, rồi `commentThreads.list` (order relevance) lấy bình luận nổi bật. Đã dùng 20 lượt search (quota 100/lượt) + 1 WebSearch. Mọi con số dưới đây là số API trả về ngày 30/10/2026; link dạng `https://www.youtube.com/watch?v=<id>`. "S" = Short (≤60-90 s), "dài" = >3 phút. Dữ liệu thô (id, ngày, thời lượng, view, like, bình luận) nằm ở scratchpad phiên này, không đưa vào repo.

Lưu ý chung về độ phủ: `search.list` theo viewCount trả nhiều kết quả lạc đề (từ "jojo" trùng tên JoJo Siwa, kênh ASMR "Jojo's ASMR", game Roblox...) và trả CÙNG một nhóm video toàn cầu (OP/ED/trailer chính thức, meme tiếng Anh) cho mọi vùng. Không có số liệu riêng theo quốc gia: "vùng" ở đây là ngôn ngữ của video/kênh, không phải nơi người xem.

## 1. Video JoJo nhiều view nhất theo vùng (01/10/2025 - 30/10/2026)

### Takeaway
Ở cả bốn vùng, nhóm nhiều view nhất là Short meme/cosplay/clip cắt anime (Mỹ 3-15 triệu, Nhật 3-15 triệu, Hàn 0,4-4,6 triệu, tiếng Trung chỉ 0,1-0,65 triệu). Video chính thức của anime SBR (OP 20 triệu, ED 6,7 triệu) gom nhiều bình luận nhất. Video giải thích luật/lore dạng Short 1 phút vẫn đạt 1-4 triệu ở Mỹ (kênh xForts), còn video giải thích dài 10-25 phút chỉ 50k-900k ở mọi vùng.

### Cited Findings

**Chính thức / nhạc (xuất hiện ở mọi vùng)**
- OP không chữ SBR, Kroi "SPIN" (Warner Bros. Japan Anime, 23/09/2026, 1:31): 20.059.321 view / 377.878 like / 17.520 bl — [YouTube](https://www.youtube.com/watch?v=6UF_qprQiu0)
- "Dance with STEEL BALL RUN" (Yugo Kanno - Topic, 19/03/2026, audio): 21.300.408 view / 292.627 like — [YouTube](https://www.youtube.com/watch?v=AFZFhMyiSZ8)
- ED không chữ, 千葉雄喜「死ぬか生きるか」 (25/09/2026): 6.662.017 view / 61.986 like / **37.920 bl** (tỉ lệ bình luận/view cao nhất trong toàn bộ mẫu, like/view chỉ 0,9%) — [YouTube](https://www.youtube.com/watch?v=BfZD2dAqt6k)
- Trailer chính thức Netflix (19/12/2025): 5.091.321 / 301.616 / 14.286 — [YouTube](https://www.youtube.com/watch?v=b51C8AbRDGU); teaser 2nd STAGE (28/03/2026): 946.414 / 39.918 / 7.922 — [YouTube](https://www.youtube.com/watch?v=__GPPKA7Uww)
- MV 千葉雄喜 (25/09/2026): 2.198.753 / 22.691 / 13.723 — [YouTube](https://www.youtube.com/watch?v=B_3DQ8zN7A4)

**Tiếng Anh (regionCode US)**, top không tính video chính thức:
| Video | Kênh | Ngày | Dài | View | Like | Bl |
|---|---|---|---|---|---|---|
| [Gas Prices](https://www.youtube.com/watch?v=kMNTp7NpVGc) (skit tạo dáng JoJo) | OHIOBOSS SATOYU | 08/04/2026 | 24s | 88.111.802 | 553.940 | 1.690 |
| [JoJo Part 4 Anime vs Live action](https://www.youtube.com/watch?v=MAgovowYe2s) | Sheetie | 21/05/2026 | 15s | 15.561.946 | 215.266 | 588 |
| [The Zeppeli in the Pool](https://www.youtube.com/watch?v=gDl2s_FYndo) | CarrotBunn | 02/10/2026 | 12s | 12.635.710 | 227.653 | 1.908 |
| [Our cosplays from JoJo's](https://www.youtube.com/watch?v=sReyKDUoxzc) | KingChris | 20/04/2026 | 19s | 11.624.714 | 279.749 | 2.066 |
| [Chud to Chad](https://www.youtube.com/watch?v=KP9lI7OOUCw) (meme Funny Valentine) | Chud valentine | 17/09/2026 | 49s | 11.118.772 | 127.636 | 1.082 |
| [Kars with animals](https://www.youtube.com/watch?v=00np5lpsSfs) | Sheetie | 07/06/2026 | 17s | 10.831.071 | 218.991 | 1.136 |
| [john rod vs Modulo Yuji fan anim](https://www.youtube.com/watch?v=2VgxXh2gT2Q) | BrutalMotions | 21/07/2026 | 23s | 10.716.446 | 269.293 | 6.078 |
| [What if JoJo's anime used the music references? pt.1](https://www.youtube.com/watch?v=JzaVMSK1jLc) | xForts | 29/12/2025 | 26s | 10.665.418 | 184.718 | 801 |
| [CGI in SBR is so Good](https://www.youtube.com/watch?v=Bl75vidy7EE) | Sheetie | 17/04/2026 | 12s | 8.177.450 | 144.729 | 1.529 |
| [Steel Ball Run ain't happening in Minecraft](https://www.youtube.com/watch?v=Gjt9eM4XVlY) | Blind609 | 26/07/2026 | 26s | 7.929.603 | 240.034 | 1.156 |
| [0% win rate](https://www.youtube.com/watch?v=vjbWNMX18wk) (Emporio vs Pucci) | Aiden | 12/07/2026 | 26s | 7.600.282 | 215.108 | 2.831 |
| [Steel Ball Run's BIZARRE Dub](https://www.youtube.com/watch?v=RPMU_pXk98E) | NoSchoolSaturday | 24/02/2026 | 10s | 7.200.002 | 154.648 | 1.633 |
| [The JoJo SBR SPIN Situation Is Insane](https://www.youtube.com/watch?v=GdP4qtaLbRw) | JoBro Memes | 27/09/2026 | 9s | 6.785.481 | 143.259 | 2.173 |
| [Did you know about the JoJosapiens?](https://www.youtube.com/watch?v=2EBzfNByjmI) | xForts | 03/03/2026 | 1:23 | 4.382.823 | 203.086 | 1.728 |
| [Koichi's Sock](https://www.youtube.com/watch?v=kE80fLcqqDM) | Sheetie | 09/06/2026 | 17s | 4.055.533 | 112.868 | 1.764 |
| [The SBR anime REMOVED this](https://www.youtube.com/watch?v=hwmhglwL-Vo) | NoSchoolSaturday | 30/09/2026 | 12s | 3.738.923 | 93.435 | 779 |
| [Araki had to publicly apologize for Caesar](https://www.youtube.com/watch?v=DYNiAZO6Xs0) | xForts | 14/12/2025 | 59s | 3.238.019 | 171.411 | 1.651 |
| [I Fixed Steel Ball Run's Ending](https://www.youtube.com/watch?v=5W1m6BqvQu4) | PATONE | 25/09/2026 | 1:29 | 3.130.939 | 97.854 | 3.258 |
| [These mfs got to stop overreacting](https://www.youtube.com/watch?v=6RKVdOe83B8) (Johnny + cánh tay Saint's Corpse) | WahZabi | 23/10/2026 | 17s | 3.126.546 | 105.821 | 2.247 |
| [Is Araki bringing the muscle back to JoJo?](https://www.youtube.com/watch?v=CGEpBRJ6N3o) | xForts | 17/12/2025 | 1:05 | 3.005.233 | 141.728 | 1.162 |
| [JoJo Deaths That Made Me Cry](https://www.youtube.com/watch?v=XEzKFyclSOs) | Josuke Channel | 10/10/2026 | 34s | 2.988.913 | 85.118 | 1.275 |
| [What Echoes says about Koichi Hirose](https://www.youtube.com/watch?v=Rc0nn7Vc6D4) | xForts | 15/07/2026 | 1:08 | 2.709.060 | 126.191 | 835 |
| [Impossible JoJo Quiz 2](https://www.youtube.com/watch?v=0tC48dQG0_Q) | xForts | 06/02/2026 | 1:05 | 2.357.355 | 78.842 | 1.754 |
| [Who is John Rod?](https://www.youtube.com/watch?v=52qWnLom1o4) | xForts | 17/07/2026 | 1:10 | 1.897.858 | 114.244 | 1.499 |
| [Araki has never done this before...](https://www.youtube.com/watch?v=en04pq7eRx8) (JoJoLands) | xForts | 21/02/2026 | 1:04 | 1.756.849 | 78.471 | 599 |
| [Tusk ACT1 Explained](https://www.youtube.com/watch?v=y2xj5cublIw) | xForts | 08/04/2026 | 1:23 | 1.489.956 | 55.038 | 307 |
| [I Finished the SBR Race in Real Life](https://www.youtube.com/watch?v=30bQ3HCcKnY) | TREY the Explainer | 13/03/2026 | 2:07:29 | 1.718.072 | 61.612 | 3.124 |

Video dài tiếng Anh (giải thích, review tập):
- [Why can Gyro see Stands?](https://www.youtube.com/watch?v=jvd5vkQWb1U) (Angelo's Dank Adventure, 12/10/2026, 11:49): 884.522 / 9.797 / 560
- [76 Animators Suffered For This](https://www.youtube.com/watch?v=affUTCvqnfw) (xForts, 17/10/2026, 12:48): 675.941 / 11.573 / 803
- [What If Every JoJo Had a Requiem Stand?](https://www.youtube.com/watch?v=G-YH4X9Lj-M) (everwhat, 24/06/2026, 14:11): 458.062 / 8.412 / 370
- [How 1 Song Ruined JoJo Fridays](https://www.youtube.com/watch?v=PSkui3GGhfU) (Chewiedog1, 26/09/2026, 8:09): 442.815 / 15.742 / 1.557
- [Steel Ball Run BROKE the internet...](https://www.youtube.com/watch?v=eTGd85i_B6A) (xForts, 20/03/2026, 8:34): 437.412 / 18.706 / 1.378
- [All Stands in Purple Haze Feedback](https://www.youtube.com/watch?v=GW4DT5ludRU) (xForts, 09/05/2026, 18:28): 430.964 / 16.104 / 565
- [What Were They Thinking? (SBR Ep.2)](https://www.youtube.com/watch?v=Kdf0m2crS28) (xForts, 26/09/2026, 12:59): 337.845 / 8.564 / 851
- [John Rod: The Final Boss of JoJo's](https://www.youtube.com/watch?v=jFTNLma12b0) (Chewiedog1, 23/07/2026, 8:43): 283.658 / 12.114 / 751
- [This Man Made One Rule. Steel Ball Run Broke It.](https://www.youtube.com/watch?v=Bw2BJ4fMvQE) (Angelo's Dank Adventure, 27/09/2026, 10:47): 264.612 / 6.914 / 589
- [The Origin of Stands (SBR Ep.4)](https://www.youtube.com/watch?v=AJkyw8uzk5w) (xForts, 10/10/2026, 11:01): 140.102 / 4.322 / 291
- Kênh liệt kê "Every Stand Explained" (AnimeGuy, NovaVibe, DeeperThanAnime, Bizarre Star Platinum): 3k-50k view mỗi video — ví dụ [Every Stand in SBR Explained](https://www.youtube.com/watch?v=oy-ZrqjzPtc) 4.527 view.

**Tiếng Nhật (regionCode JP)**
| Video | Kênh | Ngày | Dài | View | Like | Bl |
|---|---|---|---|---|---|---|
| [このじじい根っからのギャンブラーだぜ](https://www.youtube.com/watch?v=mqonuEW-Td4) (clip phần 3, Darby) | 映像帖えいぞうちょう | 01/06/2026 | 1:00 | 15.562.512 | 156.522 | 865 |
| [スターダストクルセイダース](https://www.youtube.com/watch?v=gcAuVmG8IxI) (clip) | Ratih | 12/05/2026 | 59s | 8.215.569 | 88.382 | 836 |
| [JOJO WORLD](https://www.youtube.com/watch?v=eXoYtktpmg8) | てっつー | 16/04/2026 | 18s | 7.502.162 | 151.299 | 1.125 |
| [性格が垣間見える主人公たちの休憩](https://www.youtube.com/watch?v=XxZSpS7Yn_g) (game Eyes of Heaven) | わらいしん | 07/12/2025 | 26s | 6.590.342 | 84.109 | 1.021 |
| [DU 第10話 イタリア料理を食べに行こう](https://www.youtube.com/watch?v=itd0VQoHsC4) (Short chính thức) | Warner Bros. Japan Anime | 15/12/2025 | 49s | 6.420.570 | 122.974 | 1.686 |
| [DIOが「最弱」と評したスタンド](https://www.youtube.com/watch?v=90eJLBCCoKc) | Smith Family Madness | 23/07/2026 | 1:00 | 6.379.031 | 76.327 | 867 |
| [ジョジョに出てた頃の小泉進次郎](https://www.youtube.com/watch?v=0njlGrHwVmg) (meme "ký ức không tồn tại") | マサ内藤 | 08/12/2025 | 37s | 5.718.576 | 96.925 | 2.007 |
| [吉良吉影 × IRIS OUT MAD](https://www.youtube.com/watch?v=M-iqG_Ne8-g) | Nero | 07/11/2025 | 1:26 | 4.542.235 | 102.058 | 1.928 |
| [ジョジョ7部ED、全て間違っていて好き過ぎるｗ](https://www.youtube.com/watch?v=fDmZNDqP3nU) | かぱおと | 28/09/2026 | 1:10 | 4.042.858 | 72.972 | 3.120 |
| [ジョジョ漢字テスト](https://www.youtube.com/watch?v=NvldtDbVs_A) (đố đọc chữ Hán trong JoJo) | あきとんとん | 16/08/2026 | 1:28 | 3.464.232 | 60.679 | 725 |
| [ザ・ジョジョランズ OP (Unofficial)](https://www.youtube.com/watch?v=oOxgr_KM0RE) | ZAMORI | 30/09/2026 | 1:51 | 2.967.919 | 82.559 | 4.757 |
| [元々OPの曲だった説ない？](https://www.youtube.com/watch?v=LJKduFwaJUM) (ED) | YukiChiba_hiphop | 28/09/2026 | 32s | 2.482.185 | 35.741 | 702 |
| [もしSBRのEDがウェカピポだったら](https://www.youtube.com/watch?v=nOBfoPigI90) | エルモア | 26/09/2026 | 23s | 2.102.617 | 32.269 | 1.114 |
| [最悪なココロジョジョルを毎日聴かせるチョコラータ](https://www.youtube.com/watch?v=Pnycr6sKb3g) | Nexのアトリエ | 05/10/2026 | 1:41 | 1.990.377 | 34.365 | 1.171 |
| [ジョジョで今もっともアツイスタンド](https://www.youtube.com/watch?v=mX8U25t-fbM) (ゆっくり解説) | ポルポの部屋 | 23/07/2026 | 58s | 1.581.509 | 30.043 | 633 |
| [ジョジョSBRのEDの賛否両論にラッパーが反応](https://www.youtube.com/watch?v=zBTsdezoC30) | ちびペンギン | 30/09/2026 | 48s | 1.568.277 | 13.990 | 2.384 |
| [ジョジョのテロ予言、1番怖いのは作者の反応](https://www.youtube.com/watch?v=ZHbC2rwuzjo) | オラオラ反応集 | 23/02/2026 | 55s | 1.329.451 | 43.427 | 1.056 |
| [ジョジョの奇妙な問題に答えよう！第5部](https://www.youtube.com/watch?v=TRSUsZgnV0Y) (chính thức) | ジャンプチャンネル | 23/03/2026 | 1:01:46 | 1.233.999 | 7.537 | 244 |
| [未だに最強スタンド議論にあがるイエローテンパランス](https://www.youtube.com/watch?v=Pv9SzR392_M) | グレートなジョジョ考察・解説 | 09/04/2026 | 59s | 853.203 | 8.432 | 585 |
| [なぜ5部ポルナレフは3部から性格が変わったのか](https://www.youtube.com/watch?v=TCPzPJolYpc) | グレートなジョジョ考察・解説 | 02/06/2026 | 1:00 | 819.781 | 13.090 | 251 |
| [【ジョジョ】えっ、何！海外で話題の最新スタンド](https://www.youtube.com/watch?v=7yT7NWLplOM) (John Rod) | ゆっくりジョジョ | 27/07/2026 | 45s | 705.917 | 11.175 | 306 |
| [【論争必至】ジョジョは本当に終わるの？](https://www.youtube.com/watch?v=8_d4Ow85RCs) | ジョジョの奇妙な解説 | 20/02/2026 | 58s | 480.866 | 9.391 | 394 |
| [ジョジョ6部はなぜ意味不明で不人気なのか](https://www.youtube.com/watch?v=c0oGSTHXit4) | グレートなジョジョ考察・解説 | 01/05/2026 | 1:01 | 339.649 | 3.690 | 538 |

Video 解説/考察 dài tiếng Nhật: [般若が語るジョジョPart.7 SBR](https://www.youtube.com/watch?v=Gbgf77QAFXU) (OCEANS, 22:20) 436.261 view; [鉄球って何？回転って何？を本気で解説](https://www.youtube.com/watch?v=ZWaLekihZIg) (20:03) 134.045; [勝率0％から勝った戦いTOP15](https://www.youtube.com/watch?v=4SVoZlJV7F8) (24:22) 83.571; ["覚悟"を体現したキャラTOP20](https://www.youtube.com/watch?v=Nm8-LEALxPE) (24:35) 56.463; các buổi nói chuyện dài về ED 23-38k ([Anime Music Journal](https://www.youtube.com/watch?v=YpLy4FHwv3Y), [ラフスタ](https://www.youtube.com/watch?v=Qz2X-f0n2zs)).

**Tiếng Hàn (regionCode KR)**: bảng 18 video ở `korean_fandom.md` Q3 đã có; số mới đo thêm:
- [디오 게임 콤보](https://www.youtube.com/watch?v=UsBrErMwYRE) (신노센시, 04/12/2025, 54s): 2.340.548 / 48.429 / 474
- [Jojo fans arguing about SBR's songs](https://www.youtube.com/watch?v=HF-HTlHgDsM) (11s, tiếng Anh nhưng lên top KR): 1.200.202 / 34.817 / 1.065
- [죠죠의 주인공 너프 수준](https://www.youtube.com/watch?v=UEzyhHIAZsM) (신노센시, 17/10/2025): 912.977 / 11.237 / 534
- [Steel Ball Run OVER JJK](https://www.youtube.com/watch?v=lqvhI3fbueE) (LAG_OG, 20/03/2026): 891.177 / 25.301 / 1.331
- [똥 싼 죠니 한일 더빙 비교](https://www.youtube.com/watch?v=n3EbQMYF-48) (so sánh lồng tiếng Hàn-Nhật, 19/03/2026): 832.413 / 14.419 / 465
- [죠죠의 색이 자꾸 변하는 이유](https://www.youtube.com/watch?v=FzjEoG88yrk) (vì sao màu nhân vật đổi liên tục, 12/09/2026): 753.411 / 11.327 / 295
- [SBR 3D OP "Fistful of Steel"](https://www.youtube.com/watch?v=puJ-mXd9mgc) (fan, Vettis): 593.922 / 28.391 / 930
- Trailer Netflix Korea (lồng tiếng Hàn): 559.931 / 10.658 / 2.137 — [YouTube](https://www.youtube.com/watch?v=TXU_cnzsKTE)
- [압도적인 사기 능력 더 월드의 몰랐던 사실](https://www.youtube.com/watch?v=ohS7U3MUDlM) (The World): 450.190 / 4.337 / 461
- [솔직히 6부 존잼인데](https://www.youtube.com/watch?v=x28zNIJYkl0) ("thật ra phần 6 hay mà"): 446.112 / 5.780 / 238
- [죠죠 스틸볼런이 유독 특별취급 받는 이유](https://www.youtube.com/watch?v=i8MkkjGHbVk): 438.003 / 5.552 / 271
- John Rod: [너무 강해서 난리난 졸라맨 스탠드](https://www.youtube.com/watch?v=xKPVtGVEBJE) 424.476; [망해버린 존 로드 근황](https://www.youtube.com/watch?v=nhz4PKKUZwk) 498.434
- Dài: [푸치가 원펀맨 세계관에 가면](https://www.youtube.com/watch?v=foD2m42up50) (22:34) 216.922 / 2.716 / **830**; [죠죠 최종보스들의 위엄](https://www.youtube.com/watch?v=XImTlibMHXM) (13:26) 194.318; [디오는 DIO를 이길 수 있을까?](https://www.youtube.com/watch?v=7qWJzT7JKR0) (Dio phần 1 vs DIO phần 3) 104.338 / 265 bl; [죠죠 추천 하지 마세요](https://www.youtube.com/watch?v=tsOpFiBSrGg) 79.501 / 464 bl.

**Tiếng Trung (regionCode TW/HK, zh-Hant và zh-Hans)**: video JoJo tiếng Trung trên YouTube nhỏ hơn hẳn các vùng khác; lượt tìm zh-Hans "JOJO 考察 解说" (HK) trả về 0 kết quả, lượt "JOJO 飙马野郎" (HK) chỉ trả video tiếng Anh/Nhật.
| Video | Kênh | Ngày | Dài | View | Like | Bl |
|---|---|---|---|---|---|---|
| [飆馬野郎 正式預告](https://www.youtube.com/watch?v=wFAGiLBWzw0) (chính thức) | Netflix Taiwan | 19/12/2025 | 2:10 | 670.045 | 7.388 | 654 |
| [JOJO x Michael Jackson: A Battle of Wits](https://www.youtube.com/watch?v=e38t8qnuiqo) (parody) | Mr·Ass | 14/06/2026 | 8:20 | 649.254 | 33.535 | 1.970 |
| [和天堂製造相同類型的替身嗎？](https://www.youtube.com/watch?v=-DSlabQ8kes) | 路過的賽文加 | 01/04/2026 | 57s | 579.350 | 16.144 | 176 |
| [动漫里的时停能力者，你第一个会想到谁？](https://www.youtube.com/watch?v=j3wN-hsu4fw) | 漫知君 | 28/04/2026 | 2:47 | 344.532 | 14.992 | 847 |
| [達比：我賭不了一點](https://www.youtube.com/watch?v=NgsYJQpjEGQ) | 宅漫記 | 24/09/2026 | 27s | 312.034 | 6.200 | 91 |
| [荒木老贼，我的替身是廉价把戏？](https://www.youtube.com/watch?v=ATH1VaqCeNE) | 木星笑工厂 | 14/11/2025 | 49s | 301.872 | 6.712 | 90 |
| [波波：迪奧替身的能力是控制樓梯！](https://www.youtube.com/watch?v=pZ3LVAVyWlg) | 路過的賽文加 | 25/03/2026 | 59s | 297.997 | 7.923 | 76 |
| [JOJO第九部結局恐成史上最慘](https://www.youtube.com/watch?v=w3Uf6EcWZfQ) | 宅漫記 | 13/04/2026 | 34s | 294.619 | 5.482 | 96 |
| [飙马野郎 圣人遗体9部位能力全解析](https://www.youtube.com/watch?v=6K_KcQY98io) | 聲波影視 | 09/10/2026 | 2:48 | 293.113 | 4.263 | 31 |
| [6款无限面板替身合集](https://www.youtube.com/watch?v=KmoUG63rZKU) | 漫知君 | 16/06/2026 | 3:00 | 281.833 | 8.600 | 91 |
| [足夠强運時，替身能力不重要](https://www.youtube.com/watch?v=lbA98paAaUU) (Pocoloco) | around the world | 27/03/2026 | 41s | 247.844 | 4.936 | 132 |
| [最強替身登場！John Rod 究竟是什麼鬼](https://www.youtube.com/watch?v=rSjtYAnTfPI) | DIO君的假電台 | 01/08/2026 | 9:08 | 245.263 | 3.690 | 185 |
| [JOJO 最迷惑替身如拉](https://www.youtube.com/watch?v=15UlrpmJEqM) | 漫知君 | 05/08/2026 | 2:45 | 242.896 | 7.369 | 167 |
| [這個替身叫什麼 (đố tên Stand, 不滅鑽石篇)](https://www.youtube.com/watch?v=8BCegi1SNVs) | 花爾-7 | 05/03/2026 | 1:29 | 223.516 | 5.562 | 117 |
| [John Rod是什麼迷因【迷因百科】](https://www.youtube.com/watch?v=z8jN0IJ-Es8) | 搞完君2.0 | 20/07/2026 | 1:50 | 222.782 | 4.434 | 308 |
| [這才是jojo真正的實力排行](https://www.youtube.com/watch?v=lM33k0bYfK8) | 動漫國度 | 21/03/2026 | 2:50 | 212.181 | 6.344 | 320 |
| [125分鐘看完JOJO第四部](https://www.youtube.com/watch?v=b-QLBrbAv8g) (tóm tắt dài) | 我是拳叔 | 01/12/2025 | 2:05:27 | 193.882 | 1.287 | 83 |
| [NETFLIX真的是JOJO動畫的原罪嗎](https://www.youtube.com/watch?v=CU0KreayFXQ) | 睿X漫畫 | 01/10/2025 | 12:48 | 127.899 | 2.063 | 256 |
| [為什麼《飆馬野郎》被公認為最高巔峰](https://www.youtube.com/watch?v=EQbGdw0rcRQ) | 爆米花娱乐 | 20/03/2026 | 44s | 119.525 | 3.189 | 131 |
| [波克洛克撞臉甲亢哥](https://www.youtube.com/watch?v=GTxUANhYSc8) (Pocoloco giống IShowSpeed) | 爆米花娱乐 | 23/03/2026 | 33s | 104.970 | 2.517 | 69 |

### Inferences
- Dùng số đo được, tầng view thường gặp của một video JoJo do fan làm (không phải chính thức): Mỹ Short 2-15 triệu; Nhật Short 0,3-8 triệu; Hàn Short 0,3-2,3 triệu (`korean_fandom.md` có Short tới 4,6 triệu); tiếng Trung 0,1-0,65 triệu; Việt Nam 0,1-1 triệu (`vietnamese_fandom.md`). Kênh Việt nằm cùng cỡ với kênh tiếng Trung, không phải cỡ Mỹ/Nhật.
- Ở cả bốn vùng, video dài (10-25 phút) đạt khoảng 1/10 view của Short cùng chủ đề, nhưng tỉ lệ bình luận/view cao hơn (ví dụ Hàn: Pucci vào One Punch Man 830 bl / 217k view; Mỹ: "How 1 Song Ruined JoJo Fridays" 1.557 bl / 443k view).

### Gaps
- Không đo được view theo quốc gia người xem (API công khai không có); "vùng" chỉ là ngôn ngữ.
- Tìm kiếm theo viewCount bỏ sót video không chứa từ khoá; Bilibili (nơi tập trung khán giả Trung Quốc đại lục) không có trên YouTube, xem `chinese_fandom.md`.
- Kênh "jojo的奇妙冒险" (6.089.394 view, [L7bkywws1wk](https://www.youtube.com/watch?v=L7bkywws1wk)) và "Gas Prices" là nội dung chỉ mượn tên/dáng JoJo; đã loại khỏi kết luận về góc khai thác.

## 2. Góc nào thắng ở từng vùng; so với Việt Nam

### Takeaway
Mỹ: meme 10-30 giây thắng tuyệt đối, nhưng Short "sự thật lore 1 phút" của xForts (Araki xin lỗi vì Caesar, Echoes nói gì về Koichi, John Rod là ai) đều 1,5-4,4 triệu, cao hơn hẳn mọi video review tập SBR (200-680k). Nhật: clip anime đăng lại và meme thắng; 考察 Short 0,15-0,85 triệu; drama ED SBR là cụm video nóng nhất tháng 9-10/2026. Hàn: "mẹo hạ địch" và so sánh/lồng tiếng. Tiếng Trung: Short giải thích Stand + "đố tên Stand" + meme bách khoa. Mọi vùng khớp kết luận Việt Nam: luật/lore phần 3-6 và "cách thắng lạ" hơn review tập SBR.

### Cited Findings
- **Luật/lore dạng Short (Mỹ):** xForts có 9 Short dài 59 giây đến 1:26 trong mẫu, đạt 0,95-4,4 triệu (8 video trên 1,4 triệu), ví dụ "Did you know about the JoJosapiens?" 4.382.823 — [YouTube](https://www.youtube.com/watch?v=2EBzfNByjmI); "Araki had to publicly apologize for Caesar" 3.238.019 — [YouTube](https://www.youtube.com/watch?v=DYNiAZO6Xs0); "What Echoes says about Koichi Hirose" 2.709.060 — [YouTube](https://www.youtube.com/watch?v=Rc0nn7Vc6D4); "Tusk ACT1 Explained" 1.489.956 — [YouTube](https://www.youtube.com/watch?v=y2xj5cublIw).
- **Review tập / tin anime SBR (Mỹ):** "What Were They Thinking? (SBR Ep.2)" 337.845 — [YouTube](https://www.youtube.com/watch?v=Kdf0m2crS28); "The Origin of Stands (SBR Ep.4)" 140.102 — [YouTube](https://www.youtube.com/watch?v=AJkyw8uzk5w); "Is Steel Ball Run REALLY worth the hype?" 199.538 — [YouTube](https://www.youtube.com/watch?v=aeAe4GH3XEc).
- **"Cách thắng lạ" / comeback:** Mỹ "0% win rate" (Emporio dùng Weather Report hạ Pucci) 7.600.282 — [YouTube](https://www.youtube.com/watch?v=vjbWNMX18wk); Nhật "勝率0％から勝った戦いTOP15" 83.571 (bản dài 24 phút) — [YouTube](https://www.youtube.com/watch?v=4SVoZlJV7F8); Hàn "입속으로 들어간 적을 제압하는 법" 4.578.555 (đã ghi ở `korean_fandom.md`).
- **Xếp hạng / mạnh nhất:** Mỹ "The STRONGEST Jojo Character" 3.804.827 (17s) — [YouTube](https://www.youtube.com/watch?v=Z8mZRSZNebE); Nhật "未だに最強スタンド議論にあがるイエローテンパランス" 853.203 / 585 bl — [YouTube](https://www.youtube.com/watch?v=Pv9SzR392_M); tiếng Trung "這才是jojo真正的實力排行" 212.181 / 320 bl — [YouTube](https://www.youtube.com/watch?v=lM33k0bYfK8). Xếp hạng dài kiểu "TOP20" của Nhật chỉ 56k — [YouTube](https://www.youtube.com/watch?v=Nm8-LEALxPE).
- **Drama ED SBR:** Nhật có ít nhất 10 video riêng về ED trong 26-30/09/2026, 0,45-4 triệu view, mỗi video 700-3.120 bình luận (ví dụ "SBRのエンディングが世界で炎上" 515.439 / 1.001 bl — [YouTube](https://www.youtube.com/watch?v=AH1i33KDKzg); "ジョジョ７部EDがダサすぎて炎上してる件" 489.938 / 1.040 bl — [YouTube](https://www.youtube.com/watch?v=aQLOqw48yME)). Mỹ: "I Fixed SBR's Ending" 3.130.939 / 3.258 bl — [YouTube](https://www.youtube.com/watch?v=5W1m6BqvQu4).
- **Đố vui / quiz:** Nhật "ジョジョ漢字テスト" 3.464.232 — [YouTube](https://www.youtube.com/watch?v=NvldtDbVs_A); Mỹ "Impossible JoJo Quiz 2" 2.357.355 / 1.754 bl — [YouTube](https://www.youtube.com/watch?v=0tC48dQG0_Q); tiếng Trung chuỗi "這個替身叫什麼" 170-224k mỗi tập — [YouTube](https://www.youtube.com/watch?v=8BCegi1SNVs).
- **Phần 6 "khó hiểu/không được yêu":** Nhật "ジョジョ6部はなぜ意味不明で不人気なのか" 339.649 / 538 bl — [YouTube](https://www.youtube.com/watch?v=c0oGSTHXit4); Hàn "솔직히 6부 존잼인데" 446.112 — [YouTube](https://www.youtube.com/watch?v=x28zNIJYkl0).
- Đối chiếu Việt Nam: Short/video Jian về luật phần 3-5 đạt 200k-1M, còn bàn luận tập SBR 2-50k — `vietnamese_fandom.md` mục 1.

### Inferences
- Định dạng nên chép cho kênh Việt: Short 60-80 giây "một sự thật lore + một câu hỏi" kiểu xForts (tiêu đề là câu khẳng định gây tò mò: "Araki phải xin lỗi công khai vì Caesar"), không phải review tập.
- Drama ED đã bão hoà ở Nhật/Mỹ từ cuối tháng 9; làm thêm lúc này là đến muộn, trừ khi có góc riêng cho người Việt.
- Quiz/đố là định dạng thắng ở ba vùng (Mỹ, Nhật, Trung) mà ghi chú Việt Nam chưa nhắc tới.

### Gaps
- Không đo được tỉ lệ giữ chân của các video này (chỉ chủ kênh xem được).
- Mẫu Nhật thiếu Niconico; mẫu tiếng Trung thiếu Bilibili.

## 3. Bình luận nhiều like nhất ở các video nhiều bình luận (tranh cãi)

### Takeaway
Bình luận top hiếm khi là cãi nhau thẳng; nhiều like nhất là câu đùa dùng chính luật/nhân vật JoJo (ED "Kars ở ngoài vũ trụ là người duy nhất may mắn"). Tranh luận thật nằm ở: (a) Gyro có thấy Stand không và vì sao, (b) John Rod có cần chạm trực tiếp không, (c) Araki quên chi tiết gia đình Zeppeli, (d) ED SBR là "ngầu cho người sành" hay dở thật, (e) ai là "time stop" gốc.

### Cited Findings
1. **ED SBR chính thức** (37.920 bl) — [YouTube](https://www.youtube.com/watch?v=BfZD2dAqt6k): toàn đùa chế bằng lore. "Lần duy nhất tôi ghen tị với Kars đang trôi ngoài vũ trụ là vì hắn không phải nghe bài này" 2.981 like; "Nghe bài này mới thấy Pizza Mozzarella đúng là kiệt tác" 2.343; tưởng tượng trận đấu đang cao trào thì bị cắt sang "ｼﾇｶｲｷﾙｶ" 2.237; "Kira cũng không nghe đài Morioh hôm phát bài này" 1.898; "Doppio thấy nhạc chuông là bài này thì lơ cuộc gọi của Boss" 1.660; một người Hàn: "đang nghe thì rơi tai nghe xuống cống, may mà không phải nghe hết" 1.336; "Phải có quan hệ cỡ nào mới được giao ED SBR với bài này?" 1.308.
2. **Rapper phản ứng ED** (2.384 bl) — [YouTube](https://www.youtube.com/watch?v=zBTsdezoC30): cãi thật về lập luận "dành cho người sành". "Hip-hop là dù người nhà mà dở thì vẫn nói dở" 615; "Bảo người ta tìm cái ngầu trong thứ tiếng Nhật cợt nhả là đòi hỏi vô lý" 1.745; "Nói 'thiên tài nên mấy người không hiểu' là câu thoái thác tệ nhất của người sáng tác" 314; "Ngoài Hannya ra ai cũng làm cao, bắt khán giả JoJo tự chiều theo" 641.
3. **"I Fixed SBR's Ending"** (3.258 bl) — [YouTube](https://www.youtube.com/watch?v=5W1m6BqvQu4): fan Nhật và Mỹ cùng đồng ý. "Tôi thích cảnh khán giả Nhật và khán giả nói tiếng Anh đều đồng ý chuyện này" 1.944; một bình luận Nhật: "Mong họ hiểu tình yêu nhạc Tây của Araki khi đặt tên Stand, và lý do các ED JoJo trước đây dùng nhạc Tây" 352.
4. **Trailer SBR Netflix** (14.286 bl) — [YouTube](https://www.youtube.com/watch?v=b51C8AbRDGU): "Họ làm Spin có tiếng như Hamon" 32.181; "'Tôi bị cái gì đó kéo tới đây' – ừ, gọi là hoạ sĩ diễn hoạt đấy" 31.873; "Netflix làm ơn đừng phát theo đợt" 25.282 (126 trả lời). Trailer tiếng Hàn (2.137 bl) — [YouTube](https://www.youtube.com/watch?v=TXU_cnzsKTE): khen tiếng Hamon trong Spin (1.849), khen phụ đề đổi sang km (1.596), và "ai cũng chê nét vẽ, màu, đổi seiyuu nhưng ra là chạy đi xem trước" (2.793).
5. **"Why can Gyro see Stands?"** (560 bl) — [YouTube](https://www.youtube.com/watch?v=jvd5vkQWb1U): "Manga nói thép cầu của Gyro mạnh hơn sau khi qua Devil's Palm; nó ảnh hưởng tới anh dù chưa thức tỉnh Stand" 2.506 (82 trả lời); "Đừng quên Avdol sinh ra đã có Stand" 1.179; "Mũi tên không phải cách duy nhất có Stand, chỉ là cách dễ nhất để có đội quân" 118; "Tôi tưởng Ball Breaker là Stand ai cũng dùng được" 571 (36 trả lời).
6. **"Araki had to publicly apologize for Caesar"** (1.651 bl) — [YouTube](https://www.youtube.com/watch?v=DYNiAZO6Xs0): "Trời, Araki quên thật à?" 53.700 (280 trả lời); "Độc giả phương Tây: lol Araki quên. Nam sinh Nhật thời đó: ông ta phải trả giá bằng máu" 26.128; "Câu 'người lớn là kẻ nói dối' chắc đánh ông ấy như xe tải" 17.869; "Trong truyện, William có thể nói dối Jonathan để cậu không thấy mình làm một gia đình mất cha" 8.609; "Đáng lẽ chỉ cần nói Zeppeli không biết mình có con" 4.077.
7. **"john rod vs Modulo Yuji"** (6.078 bl) — [YouTube](https://www.youtube.com/watch?v=2VgxXh2gT2Q): "Yu chết rồi, giờ tới lượt Ji trả thù" 22.935 (328 trả lời); "Cuối cùng có người hiểu John Rod phải chạm trực tiếp mới có tác dụng" 4.479 (87 trả lời); "John Rod quay ngang, gầy quá nên tránh hết Dismantle" 2.409. "Who is John Rod?" (1.499 bl) — [YouTube](https://www.youtube.com/watch?v=52qWnLom1o4): "the original stickwalker" 17.608; "Tôi không tưởng tượng nổi John Rod thua" 3.787.
8. **"0% win rate" (Emporio vs Pucci)** (2.831 bl) — [YouTube](https://www.youtube.com/watch?v=vjbWNMX18wk): "Jolyne hy sinh cứu cậu, Weather cho cậu Stand, Jotaro cho cậu nhạc nền, thắng là phải" 27.225 (204 trả lời); "Pucci thua vì một lần tàn ác ngẫu nhiên (giết mẹ Emporio)" 7.031; "Emporio nhốt Pucci vào phòng nhỏ, biến nó thành buồng khí" 1.656.
9. **Johnny + cánh tay Saint's Corpse** (2.247 bl) — [YouTube](https://www.youtube.com/watch?v=6RKVdOe83B8): đùa, không cãi ("'Jesus Christ!' 'Đúng, là ta'" 4.094). Chủ đề Saint's Corpse kênh đã làm.
10. **"What Echoes says about Koichi Hirose"** (835 bl) — [YouTube](https://www.youtube.com/watch?v=Rc0nn7Vc6D4): "Act 1 là âm thanh của lời nói, Act 2 là nghĩa của lời nói, Act 3 là sức nặng của lời nói" 19.036 (81 trả lời); "Koichi là cách Araki nói không cần cơ bắp hay đầu óc vẫn cứu được tình thế" 395.
11. **Tiếng Trung: ai là người dừng thời gian đầu tiên bạn nghĩ tới** (847 bl) — [YouTube](https://www.youtube.com/watch?v=j3wN-hsu4fw): "Trong lòng chỉ có ông già (DIO) và Jotaro" 1.987; "DIO chỉ dừng 5 giây, hút máu xong 9 giây, mà khí thế hơn mọi người" 870; cãi lại "Homura, nữ rồng trong Ragna mạnh hơn" 586 (37 trả lời); "Sakuya (Touhou) lấy nguyên mẫu từ DIO, tác giả tự nói" 309 (chưa kiểm chứng).

### Inferences
- Bình luận nhiều like nhất ở mọi ngôn ngữ đều là câu đùa đặt luật/nhân vật JoJo vào tình huống mới. Đây chính là câu móc cho Short giọng fan bình luận ("Lần duy nhất người ta ghen tị với Kars…").
- Tranh luận có "trả lời" nhiều (80-330 trả lời) nằm ở câu hỏi luật: ai thấy được Stand, John Rod cần chạm không, Araki có quên không. Short trả lời một câu hỏi luật kiểu đó có sẵn đất cãi.

### Gaps
- Mới đọc 12-20 bình luận top mỗi video và không đọc phần trả lời; có thể bỏ sót tranh cãi ở tầng trả lời.
- Câu "Sakuya lấy nguyên mẫu từ DIO, tác giả tự nói" chưa kiểm nguồn gốc.

## 4. Chủ đề mới cho Short (chưa có trong các ghi chú và danh sách đã làm)

### Takeaway
Bốn ứng viên có số đo tốt và có tranh luận sẵn: (1) Araki quên mất Zeppeli có cháu rồi phải xin lỗi, (2) Echoes ba Act = ba tầng của lời nói, (3) vì sao Gyro thấy Stand khi chưa có Stand, (4) ai dừng thời gian đầu tiên. Các ứng viên khác yếu hơn hoặc trùng với ghi chú cũ.

### Cited Findings
1. **"Araki quên": Zeppeli nói không có vợ con, rồi Caesar xuất hiện.** Bản đăng Jump phần 1, chương 35, Zeppeli nói ông không cưới vợ, không có con; độc giả phản đối khi Caesar (cháu ông) xuất hiện ở phần 2; Araki viết lời xin lỗi và sửa thoại thành "ta có vợ, nhưng bỏ gia đình đi theo Mặt nạ đá" — [JoJo Wiki](https://jojowiki.com/Will_Anthonio_Zeppeli); [JoJo Wiki Caesar](https://jojowiki.com/Caesar_Anthonio_Zeppeli). Hai wiki lệch nhau về bản sửa (shinshoban hay tankobon) — [Heroes Unite wiki](https://heroes-unite.fandom.com/wiki/Caesar_Anthonio_Zeppeli_(JoJo's_Bizarre_Adventure_Series)). Câu đáp "người lớn không nói dối, chỉ mắc lỗi" chỉ thấy ở NamuWiki, không rõ in ở đâu — [NamuWiki](https://en.namu.wiki/w/%EC%9C%8C%20A.%20%EC%B2%B4%ED%8E%A0%EB%A6%AC). Short tiếng Anh cùng góc: 3.238.019 view / 171.411 like — [YouTube](https://www.youtube.com/watch?v=DYNiAZO6Xs0). Hợp với bản mẫu giọng fan "Caesar what-if" mà người dùng thích.
2. **Echoes Act 1-2-3: âm thanh, nghĩa, sức nặng của lời nói** (Koichi). Short xForts 2.709.060 view; bình luận diễn giải 19.036 like — [YouTube](https://www.youtube.com/watch?v=Rc0nn7Vc6D4). Không có trong ghi chú cũ (grep "Koichi", "Echoes" ra 0 file).
3. **Vì sao Gyro thấy Stand khi chưa có Stand.** Video dài 884.522 view; tranh luận Devil's Palm (2.506 like, 82 trả lời) vs "người tập Spin cảm được" vs "Avdol sinh ra đã có" — [YouTube](https://www.youtube.com/watch?v=jvd5vkQWb1U). Lưu ý: kênh đã làm một Short về Gyro; đây là góc luật khác (ai thấy được Stand), cần kiểm khung manga trước khi làm payoff.
4. **Ai là người dừng thời gian gốc / DIO 5 → 9 giây.** Video tiếng Trung 344.532 view, 847 bl — [YouTube](https://www.youtube.com/watch?v=j3wN-hsu4fw). Ghi chú cũ chỉ nhắc "time stop" ở mảng meme tiếng Trung.
5. Ứng viên phụ (số đo có, tranh luận ít hơn):
   - Yellow Temperance có phải Stand mạnh nhất — Nhật 853.203 view / 585 bl — [YouTube](https://www.youtube.com/watch?v=Pv9SzR392_M).
   - Vì sao phần 6 bị gọi khó hiểu — Nhật 339.649 / 538 bl ([YouTube](https://www.youtube.com/watch?v=c0oGSTHXit4)); Hàn "솔직히 6부 존잼인데" 446.112 ([YouTube](https://www.youtube.com/watch?v=x28zNIJYkl0)).
   - Dio phần 1 có thắng được DIO phần 3 — Hàn 104.338 view / 265 bl — [YouTube](https://www.youtube.com/watch?v=7qWJzT7JKR0).
   - Vì sao màu nhân vật JoJo đổi liên tục — Hàn 753.411 view — [YouTube](https://www.youtube.com/watch?v=FzjEoG88yrk).
   - Polnareff "cầu thang" (DIO điều khiển cầu thang) — tiếng Trung 297.997 — [YouTube](https://www.youtube.com/watch?v=pZ3LVAVyWlg); Polnareff đổi tính từ phần 3 sang 5 — Nhật 819.781 — [YouTube](https://www.youtube.com/watch?v=TCPzPJolYpc) (Polnareff đã có ở ghi chú Việt, kênh Jian làm 591k).
   - Emporio + Weather Report hạ Pucci (Short 7,6 triệu, bình luận 27k like) — [YouTube](https://www.youtube.com/watch?v=vjbWNMX18wk); Emporio đã có trong ghi chú tiếng Anh/Nhật/Hàn.

### Inferences
- Ứng viên 1 mạnh nhất cho kênh: số đo cao, tranh cãi có sẵn ("Araki quên" là meme fan quốc tế), giọng fan có chỗ đùa ("nam sinh Nhật đòi máu"), và nối với Caesar mà người dùng thích. Payoff phải viết đúng mức nguồn: chương 35 và việc sửa thoại có hai wiki xác nhận; câu xin lỗi nguyên văn chưa có nguồn gốc nên ghi "người ta kể".
- Ứng viên 2 hợp Short 60 giây (ba Act = ba nhịp), nhưng là diễn giải của fan, không phải lời Araki; kịch bản phải nói rõ "fan đọc thế này".

### Gaps
- Chưa tìm được bản gốc tiếng Nhật lời xin lỗi của Araki (số Jump, trang) và câu "大人は嘘つきではない…".
- Chưa kiểm "Sakuya lấy nguyên mẫu từ DIO".
- Chưa đo xem các chủ đề mới này đã có video tiếng Việt chưa (không còn quota search để kiểm từng chủ đề trong ngày).
