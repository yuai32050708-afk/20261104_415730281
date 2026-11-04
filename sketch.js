let idleSprite; // 儲存角色待機動畫的精靈圖。
let walkSprite; // 儲存角色行走動畫的精靈圖。
let runSprite; // 儲存角色跑步動畫的精靈圖。
let jumpSprite; // 儲存角色跳躍動畫的精靈圖。
let characterX = 46; // 設定角色在畫面底部活動區的水平位置。
let characterY = 48; // 設定角色在畫面底部活動區的垂直位置。
let jumpVelocity = 0; // 記錄角色跳躍時的垂直速度。
let facingDirection = 1; // 記錄角色朝向，1 為右、-1 為左。
let draggingAnswer = null; // 儲存目前正在拖曳的文字選項編號。
let characterMode = 'patrol'; // 記錄角色目前巡走、跳躍或跑回原位的狀態。
let characterHomeX = 0; // 儲存角色開始拖曳前的位置，供答錯時跑回。
let characterDirection = 1; // 記錄角色自動巡走的方向。
let nextEncouragementAt = 0; // 記錄下一次角色隨機說鼓勵話的時間。
let speechAllowed = false; // 記錄使用者是否已操作畫面以允許播放語音。
let feedbackMessage = ''; // 儲存配對正確或錯誤時顯示的回饋文字。
let feedbackUntil = 0; // 記錄配對回饋訊息的結束時間。
let questionBank = []; // 儲存從 CSV 題庫載入的所有環保題目。
let quizQuestions = []; // 儲存本局抽出的六道題目。
let gameStarted = false; // 記錄使用者是否已按下開始遊戲。
let questionLoadError = ''; // 儲存題庫 CSV 載入失敗時的錯誤訊息。
let placedAnswers = [null, null, null, null, null, null]; // 記錄每題目前放入的文字選項。
let submitted = false; // 記錄使用者是否已經交卷。
let finalScore = 0; // 儲存交卷後的答對題數。
let confettiPieces = []; // 儲存高分時播放的彩帶粒子。
let layout = {}; // 儲存畫面重新排版後的互動區域位置。

const idleFrameBounds = [[0, 84], [89, 173], [178, 262], [267, 351]]; // 設定待機動畫各影格的實際水平邊界。
const walkFrameBounds = [[0, 78], [83, 178], [183, 273], [278, 366], [371, 464]]; // 設定行走動畫各影格的實際水平邊界。
const jumpFrameBounds = [[0, 95], [95, 190], [190, 285], [285, 380]]; // 設定跳躍動畫各影格的水平邊界。
const runFrameBounds = [[0, 93], [98, 202], [207, 309], [314, 414], [419, 521]]; // 依透明間隔精確裁切跑步精靈圖並避免前後影格互相重疊。
let answerOrder = [0, 1, 2, 3, 4, 5]; // 記錄本局打亂後的六個答案順序。

function preload() { // 在畫布開始繪製前載入角色需要的動畫圖檔。
  idleSprite = loadImage('1/stop/stop.png'); // 載入角色待機動畫圖。
  walkSprite = loadImage('1/walk/walk.png'); // 載入角色行走動畫圖。
  runSprite = loadImage('1/run.png'); // 載入角色跑步動畫圖。
  jumpSprite = loadImage('1/jump.png'); // 載入角色跳躍動畫圖。
  loadTable('questions.csv', 'csv', 'header', (table) => { // 載入外部 CSV 題庫並轉成遊戲可用的題目資料。
    questionBank = table.getRows().map((row) => ({ id: row.getString('id'), icon: row.getString('icon'), topic: row.getString('topic'), prompt: row.getString('prompt'), shortPrompt: row.getString('shortPrompt'), answer: row.getString('answer'), color: row.getString('color'), motion: row.getString('motion') })); // 將題庫每一列轉成測驗題目物件。
    if (questionBank.length < 6) { // 確認 CSV 至少包含一局測驗所需的六題。
      questionLoadError = `題庫只有 ${questionBank.length} 題，至少需要 6 題才能開始。`; // 明確顯示題數不足的錯誤。
    } // 結束題庫數量驗證。
  }, (error) => { // 題庫載入失敗時保留錯誤資訊。
    questionLoadError = `題庫載入失敗：${error}`; // 明確顯示 CSV 載入錯誤，不以空題目假裝成功。
  }); // 結束 CSV 題庫載入。
} // 結束圖檔載入函式。

function setup() { // 建立全螢幕畫布並設定初始繪圖模式。
  createCanvas(windowWidth, windowHeight); // 建立符合瀏覽器視窗大小的畫布。
  imageMode(CORNER); // 使用影格左上角作為繪圖座標。
  textFont('LXGW WenKai Mono TC'); // 使用指定的文楷單聲道繁體中文字型繪製測驗內容。
  textWrap(CHAR); // 讓繁體中文在卡片寬度不足時依字元自動換行。
  textAlign(LEFT, TOP); // 將文字對齊方式設定為左上角。
  layout = calculateLayout(); // 初始化題目與選項的響應式位置。
} // 結束畫布設定函式。

function draw() { // 每一幀更新動畫、排版並繪製測驗畫面。
  background('#bde0fe'); // 使用指定的淡藍色清除畫布背景。
  layout = calculateLayout(); // 依照目前視窗尺寸重新計算所有互動區域。
  if (questionLoadError || questionBank.length < 6) { // 題庫載入中或發生錯誤時暫停繪製測驗。
    drawQuestionLoadStatus(); // 顯示題庫載入狀態或錯誤原因。
    return; // 避免題目尚未備妥時操作測驗介面。
  } // 結束題庫狀態處理。
  if (!gameStarted) { // 遊戲尚未開始時只顯示封面。
    drawStartScreen(); // 繪製遊戲封面與開始按鈕。
    return; // 隱藏題目直到使用者開始遊戲。
  } // 結束遊戲封面判斷。
  if (quizQuestions.length !== 6) { // 確認本局題目已備妥再繪製測驗介面。
    drawQuestionLoadStatus(); // 顯示題庫載入狀態或錯誤原因。
    return; // 避免題目尚未備妥時操作測驗介面。
  } // 結束本局題目檢查。
  updateCharacter(); // 讓角色在底部自動巡走並處理答題後的跳躍或折返。
  drawHeader(); // 繪製測驗標題、操作提示與角色動畫。
  drawSectionLabels(); // 繪製題目區與文字選項區的標題。
  drawQuestionCards(); // 繪製六個可點擊朗讀的圖片題目卡片。
  drawAnswerCards(); // 繪製六個可拖曳的文字選項。
  drawFeedbackMessage(); // 顯示配對正確或錯誤的即時提示。
  drawCharacter(); // 在畫面底部繪製目前的角色動畫。
  drawSubmitButton(); // 在六題都放入選項後繪製交卷按鈕。
  drawActionButtons(); // 繪製答案歸位與重新抽題兩個操作按鈕。
  drawDraggedAnswer(); // 繪製跟隨滑鼠或手指移動的拖曳選項。
  updateAndDrawConfetti(); // 更新並繪製高分時的彩帶效果。
  drawResultDialog(); // 在交卷後顯示答題成績與重新挑戰按鈕。
} // 結束每幀繪製函式。

function calculateLayout() { // 依畫布尺寸計算題目與答案的響應式排列。
  const horizontalPadding = min(18, width * 0.04); // 設定左右留白並避免窄螢幕留白過大。
  const shortScreen = height < 600; // 判斷較矮的視窗是否需要緊湊版面。
  const columns = width < 600 && height >= 720 ? 2 : 3; // 高度足夠的手機使用兩欄保留題目寬度，較矮畫面使用三欄節省垂直空間。
  const rows = ceil(6 / columns); // 依題目欄數計算完整排列六道題目所需的列數。
  const columnGap = min(12, width * 0.025); // 設定卡片欄位之間的間距。
  const cardWidth = (width - horizontalPadding * 2 - columnGap * (columns - 1)) / columns; // 計算每張卡片的寬度。
  const questionTop = shortScreen ? 100 : (width < 760 ? 116 : 88); // 在窄螢幕為操作按鈕預留頁首位置，矮畫面再縮短上方空間。
  const questionCardHeight = shortScreen ? constrain((height - questionTop - 168) / 2, 84, 108) : (columns === 2 ? constrain((height - questionTop - 338) / 3, 112, 150) : constrain((height - questionTop - 276) / 2, 116, 164)); // 依畫面尺寸加高題目卡並為完整題幹預留換行空間。
  const questionGap = 8; // 設定圖片題目卡片列與列之間的間距。
  const questionBottom = questionTop + questionCardHeight * rows + questionGap * (rows - 1); // 計算圖片題目區的底端位置。
  const sectionSpacing = height < 440 ? 22 : 27; // 縮短題目區與文字答案區的距離。
  const answerTop = questionBottom + sectionSpacing; // 在題目與文字選項之間保留標題及拖曳提示空間。
  const answerGap = 8; // 設定文字選項卡片列與列之間的間距。
  const answerCardHeight = constrain((height - answerTop - (shortScreen ? 50 : 100) - answerGap * (rows - 1)) / rows, shortScreen ? 26 : (rows === 3 ? 46 : 68), rows === 3 ? 76 : 96); // 放大答案卡片並依剩餘畫布高度自動縮放。
  const submitHeight = 42; // 設定交卷按鈕的高度。
  const answerBottom = answerTop + answerCardHeight * rows + answerGap * (rows - 1); // 計算文字選項區底端並用於安排角色與交卷按鈕。
  const submitY = min(height - submitHeight - (shortScreen ? 6 : 10), answerBottom + (shortScreen ? 2 : 16)); // 將交卷按鈕緊鄰答案區並避免超出畫布。
  const buttonWidth = min(112, (width - horizontalPadding * 2 - 8) / 2); // 為兩個頁首操作按鈕計算可用寬度。
  const buttonGap = 8; // 設定兩個頁首按鈕之間的間距。
  const buttonsWidth = buttonWidth * 2 + buttonGap; // 計算兩個頁首按鈕組合後的總寬度。
  const buttonsX = width < 760 ? (width - buttonsWidth) / 2 : width - horizontalPadding - buttonsWidth; // 窄螢幕置中按鈕，寬螢幕靠右排列。
  const buttonY = shortScreen ? 54 : (width < 760 ? 64 : 5); // 窄螢幕將按鈕放在標題下方，避免與標題重疊。
  const buttonHeight = shortScreen ? 28 : 30; // 矮畫面縮小操作按鈕並為完整題目騰出空間。
  const questionRects = []; // 建立題目卡片座標清單。
  const answerRects = []; // 建立文字選項卡片座標清單。
  const zoneRects = []; // 建立每張題目卡片下方放置區的座標清單。

  for (let index = 0; index < 6; index += 1) { // 依序計算六道題目與六個答案的位置。
    const column = index % columns; // 計算目前卡片所在的欄位。
    const row = floor(index / columns); // 計算目前卡片所在的列。
    const x = horizontalPadding + column * (cardWidth + columnGap); // 計算目前卡片的水平位置。
    const questionY = questionTop + row * (questionCardHeight + questionGap); // 計算題目卡片的垂直位置。
    const answerY = answerTop + row * (answerCardHeight + answerGap); // 計算答案卡片的垂直位置。
    questionRects.push({ x: x, y: questionY, w: cardWidth, h: questionCardHeight }); // 儲存目前圖片題目卡片的範圍。
    answerRects.push({ x: x, y: answerY, w: cardWidth, h: answerCardHeight }); // 儲存目前文字選項卡片的範圍。
    const zoneHeight = questionCardHeight < 110 ? 22 : 30; // 依題目卡片高度設定清楚且容易點選的放置區。
    zoneRects.push({ x: x + 6, y: questionY + questionCardHeight - zoneHeight - 4, w: cardWidth - 12, h: zoneHeight }); // 設定與題目文字分開且容易放置的拖曳區。
  } // 結束六題卡片座標計算。

  return { padding: horizontalPadding, columns: columns, rows: rows, questionTop: questionTop, questionHeight: questionCardHeight, questionBottom: questionBottom, answerTop: answerTop, answerHeight: answerCardHeight, answerBottom: answerBottom, questionRects: questionRects, answerRects: answerRects, zoneRects: zoneRects, submitX: width * 0.5 - min(150, width * 0.42), submitY: submitY, submitW: min(300, width * 0.84), submitH: submitHeight, resetAnswersRect: { x: buttonsX, y: buttonY, w: buttonWidth, h: buttonHeight }, resetQuestionsRect: { x: buttonsX + buttonWidth + buttonGap, y: buttonY, w: buttonWidth, h: buttonHeight } }; // 回傳繪圖、操作按鈕與互動需要的響應式座標。
} // 結束響應式版面計算函式。

function drawHeader() { // 繪製測驗標題、操作說明與人物動畫。
  noStroke(); // 關閉頁首背景框線。
  fill('#bde0fe'); // 使用與畫布相同的淡藍色，讓整體背景保持一致。
  rect(0, 0, width, height < 600 ? 90 : (width < 760 ? 104 : 69)); // 繪製橫跨全畫布的頁首底色並為窄螢幕按鈕留空間。
  fill('#185c3b'); // 設定深綠色標題文字。
  textAlign(CENTER, CENTER); // 將頁首文字置中對齊。
  textSize(width < 600 ? 19 : constrain(width * 0.065, 23, 30)); // 依畫面寬度設定清楚的測驗標題。
  text('環保行動配對挑戰', width / 2, 20); // 將測驗標題置中顯示。
  fill('#527565'); // 設定操作提示的柔和綠色。
  textSize(constrain(width * 0.035, 13, 17)); // 依畫面寬度設定操作提示字級。
  if (height >= 600) { // 矮畫面優先保留題目空間，隱藏次要操作提示。
    text('點圖片聽題目・拖曳環保行動到對應圖片', width / 2, 46); // 說明圖片朗讀與拖曳配對方式。
  } // 結束矮畫面操作提示判斷。
  textAlign(LEFT, TOP); // 將繪圖文字對齊方式還原為左上角。
} // 結束頁首繪製函式。

function getStartButtonRect() { // 計算封面開始按鈕的位置與響應式尺寸。
  const buttonWidth = min(280, width * 0.72); // 依畫面寬度設定開始按鈕的寬度。
  const buttonHeight = 58; // 設定容易點選的開始按鈕高度。
  return { x: (width - buttonWidth) / 2, y: height * 0.64, w: buttonWidth, h: buttonHeight }; // 回傳置中的開始按鈕範圍。
} // 結束開始按鈕座標計算。

function drawStartScreen() { // 繪製尚未開始遊戲時顯示的封面。
  noStroke(); // 關閉封面裝飾的邊框。
  fill('#d9f2e3'); // 設定封面中央卡片的淡綠色底色。
  rect(width * 0.07, height * 0.14, width * 0.86, height * 0.66, 32); // 繪製置中的封面內容卡。
  fill('#75bf88'); // 設定地球插圖的柔和綠色。
  circle(width / 2, height * 0.3, min(108, width * 0.25)); // 繪製封面中央的地球裝飾圓形。
  fill('#ffffff'); // 設定地球圖示顏色。
  textAlign(CENTER, CENTER); // 將封面文字與圖示置中排列。
  textSize(min(66, width * 0.16)); // 依畫面寬度設定地球圖示大小。
  text('🌍', width / 2, height * 0.3); // 繪製環保測驗主題地球圖示。
  fill('#185c3b'); // 設定封面標題的深綠色。
  textSize(constrain(width * 0.075, 24, 38)); // 依畫面大小設定清楚的封面標題。
  text('環保行動配對挑戰', width / 2, height * 0.43); // 顯示遊戲名稱。
  fill('#527565'); // 設定封面介紹文字顏色。
  textSize(constrain(width * 0.042, 15, 20)); // 設定封面介紹文字大小。
  const startDescription = fitTextToRect('抽出 6 道題目，配對正確的環保行動！', width * 0.78, height * 0.08, constrain(width * 0.042, 15, 20), 12); // 依封面可用空間換行介紹文字。
  drawFittedText(startDescription, width * 0.11, height * 0.47, width * 0.78, height * 0.1, true); // 在封面卡片內置中繪製完整介紹文字。
  const button = getStartButtonRect(); // 取得封面開始按鈕的位置。
  fill('#198754'); // 設定開始按鈕的鮮明綠色底色。
  rect(button.x, button.y, button.w, button.h, 22); // 繪製圓角開始遊戲按鈕。
  fill('#ffffff'); // 設定開始按鈕文字顏色。
  textSize(22); // 設定開始按鈕文字大小。
  text('開始遊戲', button.x, button.y, button.w, button.h); // 顯示開始遊戲按鈕。
  fill('#315943'); // 設定底部角色提示文字顏色。
  textSize(constrain(width * 0.035, 13, 16)); // 依畫面寬度設定底部提示文字大小。
  text('準備好一起守護地球了嗎？', width / 2, height * 0.75); // 顯示鼓勵玩家開始挑戰的提示。
  textAlign(LEFT, TOP); // 將文字對齊方式還原為左上角。
  characterX = width / 2; // 將人物置於封面下方中央。
  characterY = height * 0.88; // 將人物置於封面下方，不遮擋開始按鈕。
  drawCharacter(); // 在封面上繪製行走中的人物角色。
} // 結束封面繪製函式。

function updateCharacter() { // 更新角色底部巡走、跳躍及答錯折返狀態。
  const characterGroundY = min(height - 46, layout.answerBottom + 100); // 將角色安排在答案區附近的下方，縮短人物與測驗內容的距離。
  const characterMargin = width < 600 ? 30 : 40; // 為放大的角色保留畫面邊界。
  const minimumX = characterMargin; // 設定角色巡走路線的最左側。
  const maximumX = max(minimumX, width - characterMargin); // 設定角色巡走路線的最右側。
  const isJumping = jumpVelocity !== 0; // 判斷角色目前是否正在配對成功後跳躍。
  if (!isJumping) { // 只有角色沒有跳躍時才更新巡走路線高度。
    characterY = characterGroundY; // 依目前響應式版面更新角色巡走路線高度。
  } // 結束巡走路線高度更新。
  characterX = constrain(characterX, minimumX, maximumX); // 在視窗尺寸改變時將角色限制在新的巡走範圍內。

  if (draggingAnswer !== null) { // 拖曳答案時讓角色跟隨游標或觸控點移動。
    const previousX = characterX; // 記錄角色移動前的位置以判斷面向。
    characterX = constrain(mouseX - 36, minimumX, maximumX); // 將角色移到游標左側並限制於畫面範圍內。
    characterY = constrain(mouseY - 38, layout.questionTop + 28, height - 42); // 讓角色跟隨游標垂直移動並避開標題列。
    if (abs(characterX - previousX) > 1) { // 角色有水平移動時更新面向。
      facingDirection = Math.sign(characterX - previousX); // 讓角色朝著拖曳移動方向。
    } // 結束角色面向更新。
    return; // 拖曳期間不執行自動巡走或折返。
  } // 結束拖曳跟隨判斷。

  if (isJumping) { // 跳躍時先更新角色高度並套用重力。
    characterY += jumpVelocity; // 依跳躍速度更新角色垂直位置。
    jumpVelocity += 0.42; // 逐漸增加重力讓角色自然落回地面。
    if (jumpVelocity >= 0 && characterY >= characterGroundY) { // 角色下降並回到地面時結束跳躍。
      characterY = characterGroundY; // 將角色位置校正到巡走路線。
      jumpVelocity = 0; // 結束本次跳躍狀態。
      characterMode = 'patrol'; // 落地後恢復自動巡走。
    } // 結束落地判斷。
    return; // 跳躍期間不執行水平巡走。
  } // 結束跳躍狀態更新。

  if (characterMode === 'return') { // 答錯時讓角色快速跑回拖曳前的位置。
    const distance = characterHomeX - characterX; // 計算角色與起始位置之間的距離。
    if (abs(distance) <= 5) { // 接近起始位置時結束折返。
      characterX = characterHomeX; // 將角色精確放回起始位置。
      characterMode = 'patrol'; // 折返完成後恢復自動巡走。
    } else { // 尚未回到起始位置時繼續奔跑。
      facingDirection = Math.sign(distance); // 將角色轉向起始位置。
      characterX += facingDirection * min(9, abs(distance)); // 以快速跑步速度返回原位。
    } // 結束角色折返位置判斷。
    return; // 折返期間不執行一般巡走。
  } // 結束角色折返狀態更新。

  if (characterMode === 'celebrate') { // 配對正確時讓角色短暫停留並跳躍。
    return; // 跳躍落地前不執行一般巡走。
  } // 結束答對慶祝狀態判斷。

  characterX += characterDirection * 1.15; // 使用穩定速度讓角色在底部自動行走。
  if (characterX >= maximumX) { // 角色走到畫面右側時轉向左邊。
    characterX = maximumX; // 將角色限制在右側巡走邊界。
    characterDirection = -1; // 反轉角色巡走方向。
  } else if (characterX <= minimumX) { // 角色走到畫面左側時轉向右邊。
    characterX = minimumX; // 將角色限制在左側巡走邊界。
    characterDirection = 1; // 反轉角色巡走方向。
  } // 結束角色巡走邊界判斷。
  facingDirection = characterDirection; // 讓角色面朝目前巡走的方向。
  speakEncouragement(); // 閒暇巡走時隨機朗讀鼓勵語。
} // 結束角色狀態更新函式。

function drawCharacter() { // 繪製角色的待機、行走、跑步或跳躍動畫。
  const isJumping = jumpVelocity !== 0; // 判斷角色是否正在跳躍。
  const isRunning = characterMode === 'return'; // 判斷角色是否正在答錯後快速折返。
  const isWalking = characterMode === 'patrol'; // 判斷角色是否正在底部巡走。
  const animation = isJumping ? jumpSprite : (isRunning ? runSprite : (isWalking ? walkSprite : idleSprite)); // 依角色狀態選擇對應的精靈圖。
  const bounds = animation === jumpSprite ? jumpFrameBounds : (animation === runSprite ? runFrameBounds : (animation === walkSprite ? walkFrameBounds : idleFrameBounds)); // 取得目前動畫的影格邊界。
  const frameIndex = floor(millis() / (isRunning ? 68 : 115)) % bounds.length; // 依動畫速度循環播放影格。
  const frameStart = bounds[frameIndex][0]; // 取得目前影格在精靈圖中的水平起點。
  const frameWidth = bounds[frameIndex][1] - frameStart; // 計算目前影格的實際寬度。
  const frameHeight = animation.height; // 取得精靈圖影格的高度。
  const spriteScale = height < 520 ? 0.45 : (width < 600 ? 0.62 : 0.72); // 放大角色並在矮螢幕保留測驗操作空間。
  const spriteWidth = frameWidth * spriteScale; // 計算角色影格繪製後的寬度。
  const spriteHeight = frameHeight * spriteScale; // 計算角色影格繪製後的高度。

  push(); // 暫存畫布座標狀態以免影響其他繪圖。
  translate(characterX, characterY); // 將座標原點移至角色中心。
  scale(facingDirection, 1); // 角色朝左時水平翻轉精靈圖。
  image(animation, -spriteWidth / 2, -spriteHeight / 2, spriteWidth, spriteHeight, frameStart, 0, frameWidth, frameHeight); // 繪製目前動畫影格。
  pop(); // 還原畫布座標狀態。
} // 結束角色動畫繪製函式。

function drawSectionLabels() { // 繪製題目區和拖曳答案區的說明文字。
  noStroke(); // 關閉區塊標題的框線。
  fill('#245b40'); // 設定區塊標題的深綠色。
  textAlign(LEFT, CENTER); // 將區塊標題垂直置中對齊。
  textSize(constrain(width * 0.05, 18, 22)); // 放大區塊標題以便清楚閱讀。
  text('環保圖片題目（點圖聽題目）', layout.padding, layout.questionTop - 10); // 提示使用者點選圖片聆聽環保題目。
  text('拖曳環保行動到對應圖片下方', layout.padding, layout.answerTop - 13); // 提示使用者將文字行動放入題目下方的獨立放置區。
  textAlign(LEFT, TOP); // 將繪圖文字對齊方式還原為左上角。
} // 結束區塊標題繪製函式。

function drawQuestionCards() { // 繪製六張具有動畫圖示的環保圖片題目卡片。
  for (let index = 0; index < quizQuestions.length; index += 1) { // 依序繪製本局抽出的六張題目卡片。
    const question = quizQuestions[index]; // 取得目前題目的文字、圖示與配色資料。
    const card = layout.questionRects[index]; // 取得目前題目卡片的響應式位置。
    const zone = layout.zoneRects[index]; // 取得目前題目卡片下方的拖曳放置區。
    const compact = card.h < 110; // 判斷畫面高度是否需要使用精簡卡片排版。
    const motionTime = millis() / 360 + index * 0.8; // 計算目前題目專屬的動畫時間。
    const pulse = question.motion === 'pulse' ? 1 + sin(motionTime) * 0.09 : 1 + sin(motionTime) * 0.035; // 依題目動畫類型計算圖示縮放效果。
    const iconSize = min(width < 600 ? 22 : 31, card.h * 0.25); // 依畫面與卡片尺寸設定清楚且不遮擋題目的圖示大小。
    const zoneHasAnswer = placedAnswers[index] !== null; // 判斷目前題目是否已經放入文字選項。

    noStroke(); // 關閉題目卡片背景的框線。
    fill(question.color); // 使用每道題目專屬的淡色背景。
    rect(card.x, card.y, card.w, card.h, 15); // 繪製圓角題目卡片背景。
    fill('#315943'); // 設定題目文字的深綠色。
    textAlign(LEFT, TOP); // 將題目文字靠左上角排列。
    textSize(constrain(card.w * 0.07, 11, 18)); // 放大題目主題字並依卡片寬度調整。
    text(question.topic, card.x + 10, card.y + 6, card.w - 38, 22); // 顯示目前題目的環保主題並為圖示保留空間。
    const promptY = card.y + (compact ? 24 : 32); // 將完整題幹安排在主題標籤與圖示下方並適應矮卡片。
    const promptHeight = max(12, zone.y - promptY - 6); // 使用放置區上方的完整空間容納多行題目。
    const promptWidth = max(36, card.w - 20); // 使用卡片主要寬度顯示完整題目。
    const fittedPrompt = fitTextToRect(question.prompt, promptWidth, promptHeight, constrain(card.w * 0.075, 12, 18), 10); // 顯示完整題目並依卡片空間換行或縮字。
    drawFittedText(fittedPrompt, card.x + 10, promptY, promptWidth, promptHeight, false); // 逐行繪製完整題目並避免畫布文字框截斷內容。

    push(); // 暫存畫布狀態以縮放動畫圖示。
    const motionOffsetY = question.motion === 'float' ? sin(motionTime) * 5 : (question.motion === 'bounce' ? -abs(sin(motionTime * 1.5)) * 7 : 0); // 依題目種類計算浮動或彈跳位移。
    translate(card.x + card.w - (width < 600 ? 18 : 24), card.y + 19 + motionOffsetY); // 將圖示放在題目主題右側，避免遮住完整題幹。
    if (question.motion === 'sway') { // 讓搖擺類型的圖示左右擺動。
      rotate(sin(motionTime) * 0.16); // 依動畫時間繪製左右搖擺效果。
    } else if (question.motion === 'rotate') { // 讓旋轉類型的圖示緩慢轉動。
      rotate(motionTime * 0.3); // 依動畫時間繪製持續旋轉效果。
    } // 結束圖示旋轉方式判斷。
    scale(pulse); // 讓圖示隨時間產生輕微的呼吸動畫。
    textAlign(CENTER, CENTER); // 將圖示文字置中。
    textSize(iconSize); // 設定環保圖示的顯示大小。
    text(question.icon, 0, 0); // 繪製目前題目的動畫風格環保圖示。
    pop(); // 還原畫布狀態。

    noStroke(); // 關閉放置區背景框線。
    fill(zoneHasAnswer ? '#bce8cb' : '#ffffff'); // 以不同底色標示已作答或等待作答的放置區。
    rect(zone.x, zone.y, zone.w, zone.h, 8); // 繪製與題目文字分開的拖曳放置區。
    stroke(zoneHasAnswer ? '#48a46a' : '#aac9b5'); // 依作答狀態設定放置區邊框顏色。
    strokeWeight(1); // 設定放置區邊框粗細。
    noFill(); // 讓圓角框線保持透明填色。
    rect(zone.x, zone.y, zone.w, zone.h, 8); // 繪製放置區的圓角提示邊框。
    noStroke(); // 關閉後續文字繪製的框線。
    fill(zoneHasAnswer ? '#155d35' : '#668273'); // 設定放置區答案或提示文字顏色。
    textAlign(CENTER, CENTER); // 將放置區文字置中顯示。
    textSize(constrain(zone.w * 0.09, zone.h < 24 ? 10 : 14, 19)); // 放大放置區提示與已配對答案文字。
    const zoneText = zoneHasAnswer ? quizQuestions[placedAnswers[index]].answer : '拖曳答案到這裡'; // 取得目前已放置答案或拖曳提示文字。
    const fittedZoneText = fitTextToRect(zoneText, zone.w - 6, zone.h - 2, constrain(zone.w * 0.09, zone.h < 24 ? 10 : 14, 19), 9); // 依放置區尺寸縮字並加入必要換行。
    drawFittedText(fittedZoneText, zone.x + 3, zone.y + 1, zone.w - 6, zone.h - 2, true); // 逐行置中繪製答案或拖曳提示。
  } // 結束六張題目卡片的繪製。
  textAlign(LEFT, TOP); // 將文字對齊方式還原為左上角。
} // 結束圖片題目繪製函式。

function drawAnswerCards() { // 繪製下方六個可以拖曳的文字選項卡片。
  for (let index = 0; index < answerOrder.length; index += 1) { // 依序繪製六個答案卡片。
    const answerId = answerOrder[index]; // 取得目前顯示選項所對應的題目編號。
    const card = layout.answerRects[index]; // 取得目前文字選項卡片的顯示位置。
    const answerIsPlaced = placedAnswers.includes(answerId); // 判斷目前文字選項是否已被放入題目。
    const isBeingDragged = draggingAnswer === answerId; // 判斷目前選項是否正在拖曳中。

    if (answerIsPlaced && !isBeingDragged) { // 已放入題目的文字不再重複顯示於選項區。
      continue; // 跳過目前已經配對放置的選項。
    } // 結束已放置答案的顯示判斷。

    noStroke(); // 關閉文字選項卡片的外框。
    fill(isBeingDragged ? '#d9f2e1' : '#ffffff'); // 依拖曳狀態設定卡片底色。
    rect(card.x, card.y, card.w, card.h, 13); // 繪製圓角文字選項卡片。
    stroke(isBeingDragged ? '#24804b' : '#c8ded0'); // 依拖曳狀態設定卡片邊框顏色。
    strokeWeight(isBeingDragged ? 2 : 1); // 拖曳時加粗卡片邊框。
    noFill(); // 讓卡片外框保持透明填色。
    rect(card.x, card.y, card.w, card.h, 13); // 繪製卡片圓角邊框。
    noStroke(); // 關閉文字選項內容的框線。
    fill('#294d39'); // 設定文字選項內容的深綠色。
    textAlign(CENTER, CENTER); // 將文字選項置中排列。
    const fittedAnswer = fitTextToRect(quizQuestions[answerId].answer, card.w - 16, card.h - 8, constrain(card.w * 0.08, 15, 21), 11); // 放大答案文字並依卡片尺寸換行或縮字。
    drawFittedText(fittedAnswer, card.x + 8, card.y + 4, card.w - 16, card.h - 8, true); // 逐行置中繪製完整可拖曳答案。
  } // 結束六個文字選項的繪製。
  textAlign(LEFT, TOP); // 將文字對齊方式還原為左上角。
} // 結束文字選項繪製函式。

function drawSubmitButton() { // 所有題目完成配對後才顯示交卷按鈕。
  const allQuestionsFilled = placedAnswers.every((answerId) => answerId !== null); // 檢查六道題目是否都已經放入答案。

  if (!allQuestionsFilled || submitted) { // 未完成配對或已經交卷時不顯示交卷按鈕。
    return; // 結束目前的按鈕繪製流程。
  } // 結束按鈕顯示條件判斷。

  noStroke(); // 關閉交卷按鈕的邊框。
  fill('#198754'); // 設定交卷按鈕的鮮明綠色底色。
  rect(layout.submitX, layout.submitY, layout.submitW, layout.submitH, 20); // 繪製圓角交卷按鈕。
  fill('#ffffff'); // 設定交卷按鈕的白色文字。
  textAlign(CENTER, CENTER); // 將按鈕文字置中排列。
  textSize(16); // 設定交卷按鈕文字大小。
  text('交卷看成績', layout.submitX, layout.submitY, layout.submitW, layout.submitH); // 顯示交卷按鈕文字。
  textAlign(LEFT, TOP); // 將文字對齊方式還原為左上角。
} // 結束交卷按鈕繪製函式。

function drawActionButtons() { // 繪製清除目前配對與重新抽題兩個按鈕。
  const buttons = [{ rect: layout.resetAnswersRect, label: '答案歸位' }, { rect: layout.resetQuestionsRect, label: '重新抽題' }]; // 設定兩個按鈕的位置與操作文字。
  for (const button of buttons) { // 依序繪製答案歸位與重新抽題按鈕。
    const { x, y, w, h } = button.rect; // 取得目前按鈕的響應式位置與尺寸。
    noStroke(); // 關閉操作按鈕外框。
    fill('#ffffff'); // 設定操作按鈕的白色背景。
    rect(x, y, w, h, 15); // 繪製圓角操作按鈕。
    fill('#245b40'); // 設定操作按鈕文字顏色。
    textAlign(CENTER, CENTER); // 將操作文字置中。
    textSize(width < 360 ? 12 : 13); // 依按鈕可用寬度設定易讀字級。
    text(button.label, x, y, w, h); // 顯示目前操作按鈕的文字。
  } // 結束兩個操作按鈕的繪製。
  textAlign(LEFT, TOP); // 將文字對齊方式還原為左上角。
} // 結束操作按鈕繪製函式。

function drawQuestionLoadStatus() { // 顯示 CSV 題庫尚在載入或載入失敗的狀態。
  fill('#245b40'); // 設定載入狀態文字顏色。
  textAlign(CENTER, CENTER); // 將載入狀態文字置中顯示。
  textSize(constrain(width * 0.045, 16, 22)); // 依畫面寬度設定易讀的狀態文字大小。
  text(questionLoadError || '環保題庫載入中……', width / 2, height / 2, width * 0.86, 100); // 明確顯示等待狀態或題庫錯誤原因。
  textAlign(LEFT, TOP); // 將文字對齊方式還原為左上角。
} // 結束題庫狀態繪製函式。

function drawDraggedAnswer() { // 將正在拖曳的文字選項繪製在游標或觸控點旁。
  if (draggingAnswer === null || submitted) { // 沒有拖曳選項或已交卷時不需繪製浮動卡片。
    return; // 結束目前的拖曳繪製流程。
  } // 結束拖曳狀態判斷。

  const cardWidth = min(300, width * 0.82); // 設定加寬的拖曳文字卡片以清楚顯示完整答案。
  const cardHeight = 54; // 設定較高的拖曳文字卡片。
  const cardX = constrain(mouseX - cardWidth / 2, 4, width - cardWidth - 4); // 限制浮動卡片不超出畫布左右邊界。
  const cardY = constrain(mouseY - cardHeight / 2, 4, height - cardHeight - 4); // 限制浮動卡片不超出畫布上下邊界。

  noStroke(); // 關閉拖曳卡片陰影底色的外框。
  fill(255, 255, 255, 235); // 繪製半透明白色拖曳卡片底色。
  rect(cardX, cardY, cardWidth, cardHeight, 13); // 繪製跟隨游標移動的圓角卡片。
  stroke('#24804b'); // 設定拖曳卡片的綠色邊框。
  strokeWeight(2); // 設定拖曳卡片的邊框粗細。
  noFill(); // 讓卡片邊框保持透明填色。
  rect(cardX, cardY, cardWidth, cardHeight, 13); // 繪製浮動卡片的綠色邊框。
  noStroke(); // 關閉拖曳文字的框線。
  fill('#294d39'); // 設定拖曳中文字的深綠色。
  textAlign(CENTER, CENTER); // 將拖曳文字置中排列。
  const fittedAnswer = fitTextToRect(quizQuestions[draggingAnswer].answer, cardWidth - 16, cardHeight - 8, 16, 11); // 依浮動答案卡片尺寸縮字並加入換行。
  drawFittedText(fittedAnswer, cardX + 8, cardY + 4, cardWidth - 16, cardHeight - 8, true); // 逐行置中繪製跟隨游標移動的完整答案。
  textAlign(LEFT, TOP); // 將文字對齊方式還原為左上角。
} // 結束拖曳文字繪製函式。

function drawFeedbackMessage() { // 在角色上方顯示配對結果或拖曳操作提示。
  if (!feedbackMessage || millis() > feedbackUntil) { // 回饋時間結束或沒有訊息時不需繪製。
    return; // 結束目前的回饋訊息繪製流程。
  } // 結束回饋訊息顯示判斷。
  const bubbleWidth = min(270, width - 24); // 依畫面寬度限制提示泡泡的大小。
  const bubbleHeight = 42; // 設定人物對話泡泡的高度。
  const bubbleX = constrain(characterX - bubbleWidth / 2, 12, width - bubbleWidth - 12); // 將提示泡泡限制在畫布範圍內。
  const characterHeight = (width < 600 ? 0.62 : 0.72) * 111; // 依角色顯示比例估算人物高度以固定泡泡相對位置。
  const bubbleY = constrain(characterY - characterHeight / 2 - bubbleHeight - 12, 4, height - bubbleHeight - 12); // 讓對話泡泡隨人物移動並維持在畫布內。
  noStroke(); // 關閉提示泡泡的外框。
  fill('#ffffff'); // 設定提示泡泡的白色背景。
  rect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 18); // 繪製圓角鼓勵文字泡泡。
  triangle(constrain(characterX, bubbleX + 16, bubbleX + bubbleWidth - 16), bubbleY + bubbleHeight - 1, constrain(characterX - 9, bubbleX + 10, bubbleX + bubbleWidth - 20), bubbleY + bubbleHeight - 1, constrain(characterX + 9, bubbleX + 20, bubbleX + bubbleWidth - 10), bubbleY + bubbleHeight + 10); // 繪製指向人物的對話泡泡尾巴。
  fill('#245b40'); // 設定提示訊息文字顏色。
  textAlign(CENTER, CENTER); // 將提示訊息置中排列。
  textSize(14); // 使用清楚易讀的對話字級。
  text(feedbackMessage, bubbleX + 8, bubbleY + 3, bubbleWidth - 16, bubbleHeight - 6); // 顯示配對結果或人物鼓勵訊息。
  textAlign(LEFT, TOP); // 將文字對齊方式還原為左上角。
} // 結束即時回饋訊息繪製函式。

function drawResultDialog() { // 顯示交卷後的得分、鼓勵文字與重新挑戰按鈕。
  if (!submitted) { // 尚未交卷時不顯示成績視窗。
    return; // 結束目前的成績視窗繪製流程。
  } // 結束交卷狀態判斷。

  const panelWidth = min(340, width * 0.88); // 依畫面寬度設定成績視窗的寬度。
  const panelHeight = 250; // 設定成績視窗的高度以容納百分比分數和答對題數。
  const panelX = (width - panelWidth) / 2; // 計算成績視窗的水平置中位置。
  const panelY = (height - panelHeight) / 2; // 計算成績視窗的垂直置中位置。
  const scorePercentage = round((finalScore / quizQuestions.length) * 100); // 將答對題數換算為整數百分比分數。

  noStroke(); // 關閉半透明遮罩的邊框。
  fill(20, 45, 32, 90); // 設定成績視窗外圍的半透明深色遮罩。
  rect(0, 0, width, height); // 繪製覆蓋測驗畫面的半透明遮罩。
  fill('#ffffff'); // 設定成績視窗的白色背景。
  rect(panelX, panelY, panelWidth, panelHeight, 24); // 繪製圓角成績視窗。
  fill('#185c3b'); // 設定成績標題文字顏色。
  textAlign(CENTER, CENTER); // 將成績視窗文字置中排列。
  textSize(22); // 設定成績標題文字大小。
  text('本次測驗成績', width / 2, panelY + 36); // 顯示成績視窗標題。
  fill('#e3f5e9'); // 設定分數圓圈的淡綠色底色。
  circle(width / 2, panelY + 112, 96); // 繪製百分比分數的圓形背景。
  fill('#198754'); // 設定成績數字的綠色。
  textSize(32); // 設定百分比分數的顯示大小。
  text(`${scorePercentage}%`, width / 2, panelY + 108); // 以百分比顯示本次測驗結果。
  fill('#315943'); // 設定答對題數文字顏色。
  textSize(14); // 設定答對題數的顯示大小。
  text(`答對 ${finalScore} 題，共 ${quizQuestions.length} 題`, width / 2, panelY + 157); // 顯示百分比對應的答對題數。
  fill(finalScore / quizQuestions.length > 0.6 ? '#21834c' : '#7b6a44'); // 依分數設定鼓勵文字顏色。
  textSize(14); // 設定鼓勵文字的顯示大小。
  text(finalScore / quizQuestions.length > 0.6 ? '太棒了！你是環保行動高手！' : '再接再厲，每個行動都能讓地球更好！', width / 2, panelY + 183); // 依答題成績顯示鼓勵訊息。
  fill('#198754'); // 設定再次挑戰按鈕的綠色底色。
  rect(panelX + 56, panelY + 208, panelWidth - 112, 30, 16); // 繪製重新開始按鈕。
  fill('#ffffff'); // 設定重新開始按鈕的白色文字。
  textSize(13); // 設定重新開始按鈕文字大小。
  text('回到封面', width / 2, panelY + 223); // 顯示返回遊戲封面的按鈕文字。
  textAlign(LEFT, TOP); // 將文字對齊方式還原為左上角。
} // 結束成績視窗繪製函式。

function updateAndDrawConfetti() { // 更新並繪製分數高於百分之六十時的彩帶效果。
  for (let index = 0; index < confettiPieces.length; index += 1) { // 逐一更新所有彩帶粒子。
    const piece = confettiPieces[index]; // 取得目前更新中的彩帶粒子。
    piece.x += piece.vx; // 依水平速度更新彩帶位置。
    piece.y += piece.vy; // 依垂直速度更新彩帶位置。
    piece.vy += 0.035; // 加入輕微重力讓彩帶逐漸往下飄落。
    piece.rotation += piece.spin; // 更新彩帶的旋轉角度。
    if (piece.looping && piece.y > height + 12) { // 高分彩帶掉出畫布底部時讓它從上方重新出現。
      piece.y = random(-height * 0.3, -8); // 將彩帶移回畫布上方的隨機位置。
      piece.x = random(width); // 重新設定彩帶的水平位置。
      piece.vy = random(1.2, 3.8); // 重新設定彩帶向下飄落速度。
    } else if (!piece.looping) { // 配對彩帶只播放一小段時間。
      piece.life -= 1; // 逐幀減少配對彩帶的存留時間。
    } // 結束彩帶重新出現判斷。
    push(); // 暫存畫布狀態以旋轉目前彩帶。
    translate(piece.x, piece.y); // 將繪圖原點移至目前彩帶中心。
    rotate(piece.rotation); // 依目前角度旋轉彩帶。
    noStroke(); // 關閉彩帶粒子的外框。
    fill(piece.color); // 設定目前彩帶粒子的顏色。
    rect(-piece.size / 2, -piece.size / 3, piece.size, piece.size * 0.58, 2); // 繪製目前旋轉中的彩帶。
    pop(); // 還原畫布座標狀態。
  } // 結束所有彩帶粒子的更新與繪製。
  confettiPieces = confettiPieces.filter((piece) => piece.looping || piece.life > 0); // 移除播放完畢的短暫配對彩帶。
} // 結束彩帶動畫函式。

function mousePressed() { // 處理圖片點擊、答案拖曳與成績按鈕操作。
  if (!gameStarted) { // 遊戲尚未開始時只接受封面開始按鈕操作。
    if (questionBank.length >= 6 && !questionLoadError && pointInRect(mouseX, mouseY, getStartButtonRect())) { // 確認題庫已載入且使用者按下開始遊戲。
      startGame(); // 抽選本局題目並開始測驗。
      speechAllowed = true; // 使用者開始遊戲後允許角色播放語音鼓勵。
      nextEncouragementAt = millis() + random(6000, 11000); // 設定首次隨機鼓勵語音時間。
    } // 結束開始遊戲按鈕判斷。
    return false; // 避免封面點擊誤觸測驗中的拖曳選項。
  } // 結束封面點擊處理。

  speechAllowed = true; // 使用者操作後允許角色播放隨機語音鼓勵。
  if (nextEncouragementAt === 0) { // 第一次互動時設定角色第一次鼓勵語音時間。
    nextEncouragementAt = millis() + random(6000, 11000); // 延遲一段隨機時間後再說鼓勵話。
  } // 結束首次語音時間設定。

  if (pointInRect(mouseX, mouseY, layout.resetAnswersRect)) { // 檢查使用者是否按下答案歸位按鈕。
    resetAnswers(); // 清除目前配對並讓六個答案回到下方選項區。
    return false; // 阻止瀏覽器將按鈕點擊轉為頁面操作。
  } // 結束答案歸位按鈕點擊處理。

  if (pointInRect(mouseX, mouseY, layout.resetQuestionsRect)) { // 檢查使用者是否按下重新抽題按鈕。
    resetQuiz(); // 重新抽題、打亂答案並清除作答狀態。
    return false; // 阻止瀏覽器將按鈕點擊轉為頁面操作。
  } // 結束重新抽題按鈕點擊處理。

  if (submitted) { // 成績視窗顯示時只處理返回封面按鈕。
    const panelWidth = min(340, width * 0.88); // 重新計算成績視窗的寬度。
    const panelX = (width - panelWidth) / 2; // 重新計算成績視窗的水平位置。
    const panelY = (height - 250) / 2; // 重新計算成績視窗的垂直位置。
    if (pointInRect(mouseX, mouseY, { x: panelX + 56, y: panelY + 208, w: panelWidth - 112, h: 30 })) { // 確認使用者是否按下返回封面按鈕。
      returnToCover(); // 清除本局資料並返回開始畫面。
    } // 結束重新開始按鈕判斷。
    return false; // 阻止瀏覽器將點擊轉為頁面操作。
  } // 結束成績視窗點擊處理。

  if (placedAnswers.every((answerId) => answerId !== null) && pointInRect(mouseX, mouseY, { x: layout.submitX, y: layout.submitY, w: layout.submitW, h: layout.submitH })) { // 確認六題完成且使用者按下交卷按鈕。
    submitQuiz(); // 計算成績並顯示測驗結果。
    return false; // 阻止瀏覽器將點擊轉為頁面操作。
  } // 結束交卷按鈕判斷。

  for (let index = 0; index < layout.zoneRects.length; index += 1) { // 檢查使用者是否要重新拖曳已放入的文字答案。
    if (placedAnswers[index] !== null && pointInRect(mouseX, mouseY, layout.zoneRects[index])) { // 確認使用者按住已作答放置區中的文字。
      draggingAnswer = placedAnswers[index]; // 將原本放入的文字答案取出以便重新配對。
      characterHomeX = characterX; // 記錄角色在重新拖曳開始前的位置。
      placedAnswers[index] = null; // 先釋放原本的題目位置。
      return false; // 阻止瀏覽器將答案重新拖曳動作轉為頁面操作。
    } // 結束已作答放置區的拖曳判斷。
  } // 結束所有已作答放置區的拖曳檢查。

  for (let index = 0; index < layout.questionRects.length; index += 1) { // 檢查使用者是否點選圖片題目卡片。
    if (pointInRect(mouseX, mouseY, layout.questionRects[index])) { // 確認點擊位置位於其中一張題目圖片卡片。
      speakQuestion(index); // 播放趣味提示音並朗讀目前題目與正確行動。
      return false; // 阻止圖片點擊被瀏覽器當作頁面操作。
    } // 結束目前圖片題目的點擊判斷。
  } // 結束所有圖片題目的點擊檢查。

  for (let index = 0; index < layout.answerRects.length; index += 1) { // 檢查使用者是否按住一個尚未配對的文字選項。
    const answerId = answerOrder[index]; // 取得目前答案卡片所代表的題目編號。
    if (!placedAnswers.includes(answerId) && pointInRect(mouseX, mouseY, layout.answerRects[index])) { // 確認點擊位置位於可拖曳的文字選項。
      draggingAnswer = answerId; // 記錄目前正在拖曳的選項。
      characterHomeX = characterX; // 記錄角色在拖曳開始前的位置。
      speakText(quizQuestions[answerId].answer, 1); // 開始拖曳時朗讀目前的文字答案。
      return false; // 阻止瀏覽器將拖曳起始動作轉為頁面操作。
    } // 結束目前文字選項的拖曳判斷。
  } // 結束所有文字選項的拖曳檢查。

  return false; // 阻止觸控或滑鼠操作造成頁面捲動。
} // 結束按下滑鼠或觸控事件。

function mouseReleased() { // 在放開滑鼠或手指時完成答案配對。
  if (draggingAnswer === null) { // 沒有正在拖曳答案時不需更新配對。
    return false; // 結束目前的放開事件處理。
  } // 結束拖曳狀態判斷。

  let targetIndex = -1; // 記錄拖曳答案放開時所在的題目位置。
  for (let index = 0; index < layout.zoneRects.length; index += 1) { // 檢查答案是否放入其中一個題目專屬的放置區。
    if (pointInRect(mouseX, mouseY, layout.zoneRects[index])) { // 確認放開位置位於題目卡片下方的獨立放置區。
      targetIndex = index; // 記錄使用者選擇的題目位置。
      break; // 完成配對後停止檢查其他放置區。
    } // 結束目前放置區的範圍判斷。
  } // 結束所有題目放置區檢查。

  if (targetIndex !== -1) { // 答案放入任一題目時保留作答結果供交卷計分。
    const previousSlot = placedAnswers.indexOf(draggingAnswer); // 查找目前答案是否已經放在其他題目位置。
    if (previousSlot !== -1) { // 同一個答案已經放入其他題目時先清除舊位置。
      placedAnswers[previousSlot] = null; // 釋放原本使用的題目放置區。
    } // 結束舊答案位置判斷。
    placedAnswers[targetIndex] = draggingAnswer; // 將拖曳答案放入使用者選擇的題目位置。
    if (draggingAnswer === targetIndex) { // 正確配對時讓角色跳躍並播放彩帶效果。
      characterMode = 'celebrate'; // 暫停角色巡走並切換到答對慶祝狀態。
      jumpVelocity = -7.5; // 讓角色在答案正確時立刻跳起來。
      facingDirection = characterDirection; // 讓角色跳躍時維持巡走方向。
      createMatchConfetti(layout.zoneRects[targetIndex].x + layout.zoneRects[targetIndex].w / 2, layout.zoneRects[targetIndex].y); // 在正確配對的位置噴出一小束彩帶。
      feedbackMessage = random(['答對了！好棒！', '環保小尖兵，太厲害了！', '配對成功，地球謝謝你！']); // 隨機顯示答對鼓勵訊息。
      feedbackUntil = millis() + 1800; // 設定答對鼓勵訊息顯示時間。
      if (speechAllowed && 'speechSynthesis' in window) { // 瀏覽器支援語音且使用者已操作後才朗讀鼓勵。
        speakText(feedbackMessage, 1.16); // 用活潑語調朗讀答對鼓勵訊息。
      } // 結束答對語音提示。
    } else { // 錯誤配對保留答案以便交卷計分，並讓角色跑回原位。
      characterMode = 'return'; // 讓角色快速跑回開始拖曳前的位置。
      feedbackMessage = '差一點點，再想想看！'; // 顯示錯誤配對提示。
      feedbackUntil = millis() + 1800; // 設定錯誤提示訊息顯示時間。
    } // 結束正確或錯誤配對判斷。
  } else { // 答案沒有放入任何題目時讓角色跑回原位。
    characterMode = 'return'; // 讓角色快速跑回開始拖曳前的位置。
    feedbackMessage = '再試一次，拖到題目下方的框框喔！'; // 顯示清楚的操作提示。
    feedbackUntil = millis() + 1800; // 設定操作提示訊息顯示時間。
  } // 結束題目放置及畫面外放置判斷。

  draggingAnswer = null; // 清除目前的拖曳答案狀態。
  return false; // 阻止放開手勢造成瀏覽器頁面捲動。
} // 結束放開滑鼠或觸控事件。

function touchMoved() { // 避免在觸控拖曳時捲動整個網頁。
  return false; // 將觸控移動事件限制在測驗畫布內。
} // 結束觸控移動事件。

function pointInRect(pointX, pointY, rect) { // 判斷指定座標是否位於矩形互動區域內。
  return pointX >= rect.x && pointX <= rect.x + rect.w && pointY >= rect.y && pointY <= rect.y + rect.h; // 回傳座標是否落在矩形邊界範圍內。
} // 結束矩形範圍判斷函式。

function fitTextToRect(content, maxWidth, maxHeight, preferredSize, minimumSize) { // 依文字框尺寸插入換行並選擇可讀字級。
  let fontSize = preferredSize; // 從建議字級開始嘗試文字排版。
  let wrappedText = content; // 儲存目前字級下的換行文字。
  while (fontSize >= minimumSize) { // 在文字高度不足時逐步縮小字體。
    textSize(fontSize); // 設定目前測試使用的字級。
    const lines = []; // 建立手動換行後的文字列。
    let currentLine = ''; // 儲存目前正在累積的文字列。
    for (const character of Array.from(content)) { // 逐字測量繁體中文字寬度以支援字元換行。
      const candidateLine = currentLine + character; // 組合目前行與下一個字元。
      if (currentLine && textWidth(candidateLine) > maxWidth) { // 下一個字元超出文字框時換到下一行。
        lines.push(currentLine); // 保存已完成的文字列。
        currentLine = character; // 開始累積下一列文字。
      } else { // 下一個字元仍可放入目前行時繼續累積。
        currentLine = candidateLine; // 將目前字元加入文字列。
      } // 結束目前字元的換行判斷。
    } // 結束逐字換行計算。
    if (currentLine) { // 最後一行有文字時加入換行結果。
      lines.push(currentLine); // 保存最後一行文字。
    } // 結束最後一行處理。
    wrappedText = lines.join('\n'); // 將各行組合成 p5.js 可繪製的多行文字。
    if (lines.length * fontSize * 1.2 <= maxHeight || fontSize === minimumSize) { // 文字列高度足夠或已到最小字級時停止縮字。
      return { text: wrappedText, size: fontSize }; // 回傳完整換行文字與適合的字級。
    } // 結束文字高度檢查。
    fontSize -= 1; // 文字仍超出範圍時縮小一個字級再重新排版。
  } // 結束字級縮放迴圈。
  return { text: wrappedText, size: minimumSize }; // 回傳最小字級的文字排版結果。
} // 結束文字換行與字級調整函式。

function drawFittedText(fittedText, x, y, maxWidth, maxHeight, centered) { // 逐行繪製已換行文字，避免 p5.js 文字框截斷內容。
  const lines = fittedText.text.split('\n'); // 取得排版後的每一行文字。
  const lineHeight = fittedText.size * 1.2; // 使用與文字測量相同的行高。
  textSize(fittedText.size); // 設定目前文字排版的字級。
  if (centered) { // 答案和放置提示需要在文字框內水平、垂直置中。
    textAlign(CENTER, CENTER); // 將每行文字設為置中對齊。
    const firstLineY = y + maxHeight / 2 - (lines.length * lineHeight) / 2 + lineHeight / 2; // 計算多行文字整體置中的第一行座標。
    for (let index = 0; index < lines.length; index += 1) { // 逐行繪製答案文字。
      text(lines[index], x + maxWidth / 2, firstLineY + index * lineHeight); // 在卡片中央繪製目前文字行。
    } // 結束置中答案繪製。
  } else { // 題目內文需要從文字框左上角依序排列。
    textAlign(LEFT, TOP); // 將題目文字靠左上角對齊。
    for (let index = 0; index < lines.length; index += 1) { // 逐行繪製題目文字。
      text(lines[index], x, y + index * lineHeight); // 在卡片內繪製目前文字行。
    } // 結束題目文字繪製。
  } // 結束文字對齊方式判斷。
} // 結束逐行文字繪製函式。

function speakQuestion(questionIndex) { // 以趣味提示音與繁體中文語音朗讀題目。
  const question = quizQuestions[questionIndex]; // 取得被點選題目的朗讀內容。
  playChime(); // 先播放短促明亮的提示音。
  speakText(question.prompt, 0.92); // 只朗讀詳細題目，不讀出正確答案或額外解釋。
} // 結束題目語音朗讀函式。

function speakText(message, rate) { // 使用瀏覽器語音合成功能朗讀指定的繁體中文內容。
  if ('speechSynthesis' in window) { // 確認瀏覽器支援內建文字轉語音功能。
    window.speechSynthesis.cancel(); // 停止前一次朗讀以避免多段語音重疊。
    const utterance = new SpeechSynthesisUtterance(message); // 建立目前要朗讀的文字內容。
    utterance.lang = 'zh-TW'; // 指定使用繁體中文語音。
    utterance.rate = rate; // 依題目朗讀或角色鼓勵設定語音速度。
    utterance.pitch = 1.22; // 提高語音音調增添活潑感。
    window.speechSynthesis.speak(utterance); // 開始朗讀題目或角色鼓勵內容。
  } // 結束瀏覽器語音功能判斷。
} // 結束指定文字語音朗讀函式。

function speakEncouragement() { // 在使用者沒有拖曳作答時隨機朗讀角色鼓勵語。
  if (!speechAllowed || submitted || draggingAnswer !== null || millis() < nextEncouragementAt) { // 尚未啟用語音、正在作答或還沒到播放時間時不朗讀。
    return; // 結束目前的鼓勵語音檢查。
  } // 結束鼓勵語音播放條件判斷。
  if ('speechSynthesis' in window && window.speechSynthesis.speaking) { // 避免角色鼓勵語與題目朗讀重疊。
    nextEncouragementAt = millis() + 2500; // 朗讀完成後再稍候播放鼓勵語。
    return; // 結束目前的語音播放檢查。
  } // 結束語音重疊判斷。
  const encouragements = ['你做得很好，地球因你更美好！', '每個小小的環保行動都很重要！', '一起愛地球，從今天開始！', '答對了也別忘了實踐環保喔！', '你是地球的好朋友！']; // 準備多句有趣的環保鼓勵內容。
  feedbackMessage = random(encouragements); // 將隨機鼓勵話顯示為跟著人物移動的對話泡泡。
  feedbackUntil = millis() + 4200; // 讓人物對話泡泡顯示數秒方便閱讀。
  speakText(feedbackMessage, 1.08); // 隨機選一句鼓勵話並以輕快語速朗讀。
  nextEncouragementAt = millis() + random(10000, 18000); // 設定下一次隨機鼓勵語音的播放時間。
} // 結束角色隨機鼓勵語音函式。

function playChime() { // 使用 p5.sound 播放兩段式的趣味提示音。
  const tone = new p5.Oscillator('sine'); // 建立柔和的正弦波提示音。
  tone.freq(660); // 設定提示音的起始音高。
  tone.amp(0); // 先將音量設為零避免開始時產生爆音。
  tone.start(); // 啟動提示音振盪器。
  tone.amp(0.13, 0.025); // 在短時間內平順提高提示音音量。
  setTimeout(() => { // 延遲一小段時間後播放較高的第二個音。
    tone.freq(880, 0.08); // 將提示音平順地提高到第二個音高。
    tone.amp(0, 0.22); // 讓提示音在短時間內自然淡出。
    setTimeout(() => { // 等待提示音淡出完成後停止振盪器。
      tone.stop(); // 停止提示音以釋放音訊資源。
    }, 280); // 設定停止提示音的延遲時間。
  }, 95); // 設定兩段提示音之間的間隔。
} // 結束趣味提示音函式。

function submitQuiz() { // 計算六道配對題的得分並啟動高分彩帶。
  finalScore = 0; // 交卷時計分歸零後重新計算。
  for (let index = 0; index < quizQuestions.length; index += 1) { // 逐題比對放入的答案與正確答案。
    if (placedAnswers[index] === index) { // 確認目前題目的答案是否配對正確。
      finalScore += 1; // 答案正確時將答對題數增加一題。
    } // 結束目前題目的答案判斷。
  } // 結束六題答案比對。
  submitted = true; // 顯示交卷後的成績視窗。
  if (finalScore / quizQuestions.length > 0.6) { // 成績高於百分之六十時建立彩帶效果。
    createConfetti(); // 建立多彩紙片並開始慶祝動畫。
  } // 結束高分彩帶判斷。
} // 結束交卷與計分函式。

function createConfetti() { // 建立畫面各處飄落的彩帶粒子。
  const colors = ['#ff6b6b', '#ffd166', '#5bc0eb', '#8ac926', '#c77dff', '#ff9f1c']; // 設定彩帶使用的明亮配色。
  confettiPieces = []; // 清除上一次測驗留下的彩帶粒子。
  for (let index = 0; index < 120; index += 1) { // 建立足以覆蓋整個畫面的彩帶數量。
    confettiPieces.push({ x: random(width), y: random(-height, height), vx: random(-1.5, 1.5), vy: random(1.2, 3.8), spin: random(-0.09, 0.09), rotation: random(TWO_PI), size: random(5, 10), color: random(colors), looping: true }); // 隨機設定會持續飄落的高分彩帶。
  } // 結束彩帶粒子建立流程。
} // 結束彩帶建立函式。

function createMatchConfetti(originX, originY) { // 在單題配對正確時從題目附近噴出短暫彩帶。
  const colors = ['#ff6b6b', '#ffd166', '#5bc0eb', '#8ac926', '#c77dff', '#ff9f1c']; // 設定答對彩帶的明亮配色。
  for (let index = 0; index < 36; index += 1) { // 為每次正確配對建立一束明顯的彩帶特效。
    confettiPieces.push({ x: originX, y: originY, vx: random(-4.2, 4.2), vy: random(-6.5, -1.5), spin: random(-0.14, 0.14), rotation: random(TWO_PI), size: random(7, 13), color: random(colors), life: 75, looping: false }); // 讓彩帶從正確題目周圍向外噴灑。
  } // 結束單次答對彩帶建立流程。
} // 結束配對成功彩帶函式。

function startGame() { // 從封面開始遊戲並抽出本局題目。
  resetQuiz(); // 隨機抽取六道題目並打亂答案選項。
  if (quizQuestions.length === 6 && !questionLoadError) { // 確認題目成功準備後才切換至測驗畫面。
    gameStarted = true; // 顯示題目與答案選項。
  } // 結束開始狀態更新。
} // 結束開始遊戲函式。

function resetQuiz() { // 清除目前測驗狀態並重新開始作答。
  if (questionBank.length < 6) { // 避免題庫未載入時開始不完整測驗。
    if (!questionLoadError) { // 尚無載入錯誤時補上清楚的狀態訊息。
      questionLoadError = '題庫尚未載入完成，請確認 questions.csv 可以正常讀取。'; // 提示使用者檢查外部 CSV 題庫。
    } // 結束載入狀態訊息判斷。
    return; // 題庫不足時不繼續重設測驗資料。
  } // 結束題庫數量檢查。
  quizQuestions = shuffle(questionBank).slice(0, 6); // 每次重新開始都隨機抽出六道不同題目。
  answerOrder = shuffle([0, 1, 2, 3, 4, 5]); // 每次重新開始都打亂六個文字答案的顯示順序。
  placedAnswers = [null, null, null, null, null, null]; // 清空六道題目目前放入的文字答案。
  draggingAnswer = null; // 清除尚未放開的拖曳答案。
  submitted = false; // 關閉成績視窗並重新開放作答。
  finalScore = 0; // 將答對題數歸零。
  confettiPieces = []; // 停止並清除上一輪的彩帶動畫。
  characterMode = 'patrol'; // 讓角色恢復在底部巡走。
  jumpVelocity = 0; // 清除上一輪測驗留下的跳躍狀態。
  feedbackMessage = ''; // 清除上一輪顯示的答題回饋。
  characterX = width / 2; // 將角色放回畫面中央附近開始新一輪巡走。
  questionLoadError = ''; // 清除上一輪可能出現的題庫狀態訊息。
  if ('speechSynthesis' in window) { // 確認瀏覽器支援語音朗讀功能。
    window.speechSynthesis.cancel(); // 停止上一輪測驗可能尚未完成的朗讀。
  } // 結束瀏覽器語音功能判斷。
} // 結束重新開始函式。

function resetAnswers() { // 清除本局配對並將所有答案放回原本的選項位置。
  placedAnswers = [null, null, null, null, null, null]; // 清除六道題目已放入的答案，讓選項全部回到下方。
  draggingAnswer = null; // 結束可能正在進行的答案拖曳。
  submitted = false; // 關閉成績畫面並重新開放目前題目作答。
  finalScore = 0; // 清除上一份成績但不更換題目。
  confettiPieces = []; // 清除上一輪留下的彩帶特效。
  characterMode = 'patrol'; // 讓人物恢復一般巡走狀態。
  jumpVelocity = 0; // 結束可能尚未完成的跳躍。
  feedbackMessage = ''; // 清除上一輪的答題提示。
  if ('speechSynthesis' in window) { // 確認瀏覽器支援語音朗讀功能。
    window.speechSynthesis.cancel(); // 停止上一輪測驗可能尚未完成的朗讀。
  } // 結束瀏覽器語音功能判斷。
} // 結束答案歸位函式。

function returnToCover() { // 結束本局測驗並返回開始封面。
  gameStarted = false; // 隱藏題目並重新顯示遊戲封面。
  quizQuestions = []; // 清除本局題目，等玩家再次開始時重新抽題。
  placedAnswers = [null, null, null, null, null, null]; // 清除本局所有配對答案。
  draggingAnswer = null; // 結束可能尚未完成的答案拖曳。
  submitted = false; // 關閉本次成績視窗。
  finalScore = 0; // 清除本局暫存分數。
  confettiPieces = []; // 停止本局彩帶特效。
  feedbackMessage = ''; // 清除本局答題回饋。
  characterMode = 'patrol'; // 讓人物回到封面巡走狀態。
  jumpVelocity = 0; // 結束可能尚未完成的跳躍。
  if ('speechSynthesis' in window) { // 確認瀏覽器支援語音朗讀功能。
    window.speechSynthesis.cancel(); // 停止本局尚未完成的語音。
  } // 結束瀏覽器語音功能判斷。
} // 結束返回封面函式。

function windowResized() { // 在瀏覽器視窗大小變更時調整全螢幕畫布。
  resizeCanvas(windowWidth, windowHeight); // 將畫布調整為最新視窗尺寸。
  layout = calculateLayout(); // 重新計算題目、文字選項和按鈕的響應式位置。
} // 結束視窗尺寸變更函式。
