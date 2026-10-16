const colorNames = {
  '01_drink': '饮料', '02_lemon': '柠檬', '03_pear': '梨', '04_cherries': '樱桃',
  '05_tomato': '番茄', '06_banana': '香蕉', '07_apple': '苹果', '08_bun': '包子',
  '09_peas': '豌豆', '10_watermelon': '西瓜', '11_pink_donut': '粉甜甜圈',
  '12_chocolate_donut': '巧克力甜甜圈', '13_pumpkin': '南瓜', '14_red_tulip': '红花',
  '15_pink_tulip': '粉花', '16_bird': '小鸟', '17_elephant': '大象', '18_chili': '辣椒',
  '19_shrimp': '虾', '20_strawberry': '草莓',
}

const doodleNames = {
  '01_sleep': '睡觉', '02_blue_face': '蓝脸', '03_dancing': '跳舞', '04_purple_mark': '涂鸦',
  '05_drink': '饮料', '06_dog': '小狗', '07_biu': 'Biu', '08_rabbit': '兔子',
  '09_da': 'Da', '10_yellow_heart': '黄心', '11_orange_gesture': '手势',
  '12_yellow_person': '小人', '13_small_yellow_person': '小人', '14_cat': '小猫',
  '15_sandwich': '三明治', '16_tofu': '豆腐', '17_hooded_person': '雨天',
  '18_heart_bubble': '爱心泡泡', '19_dinosaur_head': '恐龙', '20_orange_heart': '橙心',
  '21_pink_rabbit': '粉兔', '22_dinosaur': '小恐龙', '23_shouting_group': '欢呼',
  '24_hotpot': '火锅', '25_hands': '击掌', '26_bird': '小鸟',
  '27_flying_top': '飞行', '28_flying_bottom': '飞行', '29_phone': '电话',
  '30_friends': '朋友',
}

const assetBase = import.meta.env?.BASE_URL ?? '/'

function entries(group, names) {
  return Object.entries(names).map(([name, title]) => ({
    id: `${group}/${name}`,
    title,
    group,
    src: `${assetBase}assets/logos/${group}/${name}.png`,
  }))
}

export const STICKER_CATALOG = [...entries('color', colorNames), ...entries('doodle', doodleNames)]
export const STICKER_KEYS = new Set(STICKER_CATALOG.map((sticker) => sticker.id))
export const STICKER_BY_ID = Object.fromEntries(STICKER_CATALOG.map((sticker) => [sticker.id, sticker]))
