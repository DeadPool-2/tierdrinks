// Seed catalog: main RU-market energy drinks (v1, sodas come later).
// image === null → frontend renders a branded placeholder tile.
// price in RUB, volume in liters. Edit freely in the app.

const D = (brand, name, flavor, volume, price, description) => ({
  brand,
  name,
  flavor,
  category: "energy",
  volume,
  price,
  description,
  image: null,
});

export const BRAND_COLORS = {
  "Red Bull": "#cc0a2f",
  Monster: "#7ac431",
  "Adrenaline Rush": "#e2231a",
  "Flash Up": "#f5a623",
  Gorilla: "#ffcb05",
  Burn: "#e4002b",
  "Drive Me": "#00a0df",
  Tornado: "#8e24aa",
  "E-ON": "#8bc34a",
  Jaguar: "#ff6f00",
  Volt: "#fdd835",
};

export const SEED_DRINKS = [
  // Red Bull
  D(
    "Red Bull",
    "Red Bull",
    "Оригинал",
    0.355,
    149,
    "Классика жанра — эталонный вкус энергетика."
  ),
  D(
    "Red Bull",
    "Red Bull Sugarfree",
    "Без сахара",
    0.355,
    149,
    "Тот же вкус, ноль сахара."
  ),
  D(
    "Red Bull",
    "Red Bull Red Edition",
    "Арбуз",
    0.355,
    159,
    "Летний арбузный профиль."
  ),
  D(
    "Red Bull",
    "Red Bull Blue Edition",
    "Черника",
    0.355,
    159,
    "Сладкая черника."
  ),
  D(
    "Red Bull",
    "Red Bull Tropical",
    "Тропические фрукты",
    0.355,
    159,
    "Микс тропиков, жёлтая банка."
  ),
  D(
    "Red Bull",
    "Red Bull Green Edition",
    "Кактус",
    0.355,
    159,
    "Экзотический кактус."
  ),

  // Monster (Black Monster в РФ)
  D(
    "Monster",
    "Monster Energy",
    "Оригинал",
    0.449,
    130,
    "Мощный цитрус-микс, зелёная банка."
  ),
  D(
    "Monster",
    "Monster Ultra",
    "Белый, без сахара",
    0.449,
    130,
    "Лёгкий цитрус, ноль сахара."
  ),
  D("Monster", "Monster Mango Loco", "Манго", 0.449, 140, "Тропическое манго."),
  D(
    "Monster",
    "Monster Pipeline Punch",
    "Маракуйя-апельсин",
    0.449,
    140,
    "Пунш из маракуйи и апельсина."
  ),
  D(
    "Monster",
    "Monster Assault",
    "Кола-вишня",
    0.449,
    130,
    "Тёмный кола-вишнёвый профиль."
  ),
  D(
    "Monster",
    "Monster Ripper",
    "Мультифрукт",
    0.449,
    140,
    "Освежающий фруктовый микс."
  ),
  D(
    "Monster",
    "Monster Khaos",
    "Сок-микс",
    0.449,
    140,
    "Полусок, микс фруктов."
  ),
  D(
    "Monster",
    "Monster Ultra Paradise",
    "Зелёное яблоко-киви",
    0.449,
    140,
    "Райский зелёный, без сахара."
  ),

  // Adrenaline Rush
  D(
    "Adrenaline Rush",
    "Adrenaline Rush",
    "Оригинал",
    0.449,
    120,
    "Насыщенный классический энергетик."
  ),
  D(
    "Adrenaline Rush",
    "Adrenaline Juicy",
    "Манго-персик",
    0.449,
    120,
    "Сочный манго-персик."
  ),
  D(
    "Adrenaline Rush",
    "Adrenaline Game Fuel",
    "Ягодный микс",
    0.449,
    120,
    "Геймерская ягодная версия."
  ),
  D(
    "Adrenaline Rush",
    "Adrenaline Red",
    "Красные ягоды",
    0.449,
    120,
    "Красные ягоды."
  ),
  D(
    "Adrenaline Rush",
    "Adrenaline Zero",
    "Без сахара",
    0.449,
    120,
    "Классика без сахара."
  ),

  // Flash Up (флешка)
  D("Flash Up", "Flash Up Energy", "Оригинал", 0.45, 75, "Бюджетная классика."),
  D(
    "Flash Up",
    "Flash Up Wildberry",
    "Лесные ягоды",
    0.45,
    75,
    "Лесные ягоды."
  ),
  D("Flash Up", "Flash Up Zero", "Без сахара", 0.45, 75, "Ноль сахара."),
  D("Flash Up", "Flash Up Mojito", "Мохито", 0.45, 75, "Мятный мохито."),
  D("Flash Up", "Flash Up Cola", "Кола", 0.45, 75, "Кола-вкус."),

  // Gorilla
  D("Gorilla", "Gorilla", "Оригинал", 0.45, 90, "Плотный классический вкус."),
  D("Gorilla", "Gorilla Mango", "Манго", 0.45, 90, "Спелое манго."),
  D("Gorilla", "Gorilla Energy Berry", "Ягода", 0.45, 90, "Ягодный микс."),
  D(
    "Gorilla",
    "Gorilla Blueberry",
    "Черника-лёд",
    0.45,
    90,
    "Черника со льдом."
  ),
  D("Gorilla", "Gorilla Cherry", "Вишня", 0.45, 90, "Вишнёвый."),

  // Burn
  D("Burn", "Burn", "Оригинал", 0.449, 110, "Пряный классический Burn."),
  D("Burn", "Burn Mango", "Манго", 0.449, 110, "Манго."),
  D("Burn", "Burn Apple-Kiwi", "Яблоко-киви", 0.449, 110, "Яблоко и киви."),
  D("Burn", "Burn Zero", "Без сахара", 0.449, 110, "Ноль сахара."),
  D(
    "Burn",
    "Burn Dark Energy",
    "Тёмные ягоды",
    0.449,
    110,
    "Тёмный ягодный профиль."
  ),

  // Drive Me
  D("Drive Me", "Drive Me", "Оригинал", 0.449, 100, "Ровная классика."),
  D(
    "Drive Me",
    "Drive Me Mango-Maracuja",
    "Манго-маракуйя",
    0.449,
    100,
    "Манго и маракуйя."
  ),
  D("Drive Me", "Drive Me Zero", "Без сахара", 0.449, 100, "Без сахара."),

  // Tornado
  D("Tornado", "Tornado Energy", "Оригинал", 0.45, 85, "Дешёвый и злой."),
  D("Tornado", "Tornado Cherry", "Вишня", 0.45, 85, "Вишня."),
  D("Tornado", "Tornado Mojito", "Мохито", 0.45, 85, "Мохито."),
  D("Tornado", "Tornado Storm", "Ягодный шторм", 0.45, 85, "Ягодный микс."),

  // E-ON
  D("E-ON", "E-ON", "Оригинал", 0.449, 95, "Классический E-ON."),
  D(
    "E-ON",
    "E-ON Mango-Maracuja",
    "Манго-маракуйя",
    0.449,
    95,
    "Манго и маракуйя."
  ),
  D(
    "E-ON",
    "E-ON Barberry",
    "Барбарис",
    0.449,
    95,
    "Ностальгический барбарис."
  ),
  D("E-ON", "E-ON Litchi", "Личи", 0.449, 95, "Экзотическое личи."),

  // Jaguar (яга)
  D(
    "Jaguar",
    "Jaguar Line",
    "Оригинал",
    0.45,
    95,
    "Слабоалкогольный энергетик, классика."
  ),
  D("Jaguar", "Jaguar Super", "Крепкий", 0.45, 95, "Более крепкая версия."),
  D("Jaguar", "Jaguar Mango", "Манго", 0.45, 95, "Манго."),

  // Volt
  D("Volt", "Volt", "Оригинал", 0.5, 90, "Пол-литра классики."),
  D("Volt", "Volt Cranberry", "Клюква", 0.5, 90, "Кисловатая клюква."),
];
