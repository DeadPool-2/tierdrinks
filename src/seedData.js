// Seed catalog: main RU-market energy drinks with brand collections/lines.
// image === null → frontend renders a branded placeholder tile.
// price in RUB (starting estimate; users add dated prices later), volume in liters.

import { tagOf } from "./flavors.js";

const D = (brand, collection, name, flavor, volume, price, description) => ({
  brand,
  collection, // line within the brand, or null
  name,
  flavor,
  flavorTag: tagOf(`${name} ${flavor}`),
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
  Reign: "#8338ec",
  Bang: "#ff3864",
  NOS: "#ff6d00",
  Effect: "#5e60ce",
};

export const SEED_DRINKS = [
  // ─── Red Bull ─── Classic / Editions
  D(
    "Red Bull",
    "Classic",
    "Red Bull",
    "Оригинал",
    0.355,
    149,
    "Классика жанра — эталонный вкус энергетика."
  ),
  D(
    "Red Bull",
    "Classic",
    "Red Bull Sugarfree",
    "Без сахара",
    0.355,
    149,
    "Тот же вкус, ноль сахара."
  ),
  D(
    "Red Bull",
    "Editions",
    "Red Bull Red Edition",
    "Арбуз",
    0.355,
    159,
    "Летний арбузный профиль."
  ),
  D(
    "Red Bull",
    "Editions",
    "Red Bull Blue Edition",
    "Черника",
    0.355,
    159,
    "Сладкая черника."
  ),
  D(
    "Red Bull",
    "Editions",
    "Red Bull Tropical",
    "Тропические фрукты",
    0.355,
    159,
    "Микс тропиков, жёлтая банка."
  ),
  D(
    "Red Bull",
    "Editions",
    "Red Bull Green Edition",
    "Драконий фрукт",
    0.355,
    159,
    "Экзотический драконий фрукт."
  ),
  // Editions вне официальной РФ-линейки (Target US, price=null — внесёте свою)
  D(
    "Red Bull",
    "Editions",
    "Red Bull Amber Edition",
    "Клубника-абрикос",
    0.355,
    null,
    "Клубника с абрикосом."
  ),
  D(
    "Red Bull",
    "Editions",
    "Red Bull Peach Edition",
    "Белый персик-нектарин",
    0.355,
    null,
    "Белый персик и нектарин."
  ),
  D(
    "Red Bull",
    "Editions",
    "Red Bull Coconut Edition",
    "Кокос-черника",
    0.355,
    null,
    "Кокос и ягоды."
  ),
  D(
    "Red Bull",
    "Editions",
    "Red Bull Sea Blue Edition",
    "Ирга",
    0.355,
    null,
    "Ирга (juneberry)."
  ),
  D(
    "Red Bull",
    "Editions",
    "Red Bull Pink Edition",
    "Лесные ягоды",
    0.355,
    null,
    "Малина, лесные ягоды, вербена."
  ),
  D(
    "Red Bull",
    "Editions",
    "Red Bull Summer Edition",
    "Судачи-лайм",
    0.355,
    null,
    "Цитрус судачи с лаймом, лимитка 2026."
  ),
  D(
    "Red Bull",
    "Editions",
    "Red Bull Spring Edition",
    "Вишня-сакура",
    0.355,
    null,
    "Вишня с сакурой, лимитка 2026."
  ),
  D(
    "Red Bull",
    "Classic",
    "Red Bull Zero",
    "Ноль сахара",
    0.355,
    null,
    "Zero — лёгкая альтернатива Sugarfree."
  ),

  // ─── Monster ─── Original / Ultra / Juiced / Rehab / Java / Reserve
  D(
    "Monster",
    "Original",
    "Monster Energy",
    "Оригинал",
    0.449,
    140,
    "Мощный цитрус-микс, зелёная банка."
  ),
  D(
    "Monster",
    "Original",
    "Monster Assault",
    "Кола-вишня",
    0.449,
    140,
    "Тёмный кола-вишнёвый профиль."
  ),
  // NB: "Zero Ultra" is the white can — there is no separate "Ultra White" SKU
  D(
    "Monster",
    "Ultra",
    "Monster Ultra",
    "Без сахара",
    0.449,
    150,
    "Белая Zero Ultra — лёгкий цитрус, ноль сахара."
  ),
  D(
    "Monster",
    "Ultra",
    "Monster Ultra Paradise",
    "Зелёное яблоко-киви",
    0.449,
    150,
    "Райский зелёный, без сахара."
  ),
  D(
    "Monster",
    "Ultra",
    "Monster Ultra Sunrise",
    "Апельсин, без сахара",
    0.449,
    150,
    "Апельсиновый рассвет."
  ),
  D(
    "Monster",
    "Ultra",
    "Monster Ultra Rosá",
    "Клубника, без сахара",
    0.449,
    150,
    "Розовая клубника."
  ),
  D(
    "Monster",
    "Ultra",
    "Monster Ultra Watermelon",
    "Арбуз, без сахара",
    0.449,
    150,
    "Арбуз без сахара."
  ),
  D(
    "Monster",
    "Ultra",
    "Monster Ultra Fiesta Mango",
    "Манго, без сахара",
    0.449,
    150,
    "Манго-фиеста."
  ),
  D(
    "Monster",
    "Ultra",
    "Monster Ultra Peachy Keen",
    "Персик, без сахара",
    0.449,
    150,
    "Персиковый."
  ),
  D(
    "Monster",
    "Juiced",
    "Monster Mango Loco",
    "Манго",
    0.449,
    150,
    "Тропическое манго."
  ),
  D(
    "Monster",
    "Juiced",
    "Monster Pipeline Punch",
    "Маракуйя-апельсин",
    0.449,
    150,
    "Пунш из маракуйи и апельсина."
  ),
  D(
    "Monster",
    "Juiced",
    "Monster Khaos",
    "Мультифрукт",
    0.449,
    150,
    "Полусок, микс фруктов."
  ),
  D(
    "Monster",
    "Juiced",
    "Monster Pacific Punch",
    "Ягодный пунш",
    0.449,
    150,
    "Ягодно-цитрусовый пунш."
  ),
  D(
    "Monster",
    "Juiced",
    "Monster Monarch",
    "Персик-нектарин",
    0.449,
    150,
    "Персик и нектарин."
  ),
  D(
    "Monster",
    "Juiced",
    "Monster Aussie Lemonade",
    "Лимонад",
    0.449,
    150,
    "Австралийский лимонад."
  ),
  D(
    "Monster",
    "Rehab",
    "Monster Rehab Tea + Lemonade",
    "Чай-лимонад",
    0.458,
    160,
    "Негазированный чай с лимонадом."
  ),
  D(
    "Monster",
    "Rehab",
    "Monster Rehab Peach Tea",
    "Персиковый чай",
    0.458,
    160,
    "Персиковый холодный чай."
  ),
  D(
    "Monster",
    "Rehab",
    "Monster Rehab Wildberry Tea",
    "Ягодный чай",
    0.458,
    160,
    "Ягодный холодный чай."
  ),
  D(
    "Monster",
    "Java",
    "Monster Java Mean Bean",
    "Кофе",
    0.443,
    165,
    "Кофе с молоком и энергией."
  ),
  D(
    "Monster",
    "Java",
    "Monster Java Loca Moca",
    "Кофе-мокко",
    0.443,
    165,
    "Мокко-кофе."
  ),
  D(
    "Monster",
    "Java",
    "Monster Java Salted Caramel",
    "Солёная карамель",
    0.443,
    165,
    "Кофе с солёной карамелью."
  ),
  D(
    "Monster",
    "Reserve",
    "Monster Reserve White Pineapple",
    "Ананас",
    0.449,
    160,
    "Белый ананас."
  ),
  D(
    "Monster",
    "Reserve",
    "Monster Reserve Watermelon",
    "Арбуз",
    0.449,
    160,
    "Арбуз, лимитка."
  ),
  D(
    "Monster",
    "Reserve",
    "Monster Reserve Orange Dreamsicle",
    "Апельсин-крем",
    0.449,
    160,
    "Апельсин со сливками."
  ),

  // ─── Adrenaline Rush ─── Rush / Juicy / Game Fuel
  D(
    "Adrenaline Rush",
    "Rush",
    "Adrenaline Rush",
    "Оригинал",
    0.449,
    120,
    "Насыщенный классический энергетик."
  ),
  D(
    "Adrenaline Rush",
    "Rush",
    "Adrenaline Zero",
    "Без сахара",
    0.449,
    120,
    "Классика без сахара."
  ),
  D(
    "Adrenaline Rush",
    "Juicy",
    "Adrenaline Juicy",
    "Манго-персик",
    0.449,
    120,
    "Сочный манго-персик."
  ),
  D(
    "Adrenaline Rush",
    "Game Fuel",
    "Adrenaline Game Fuel",
    "Ягодный микс",
    0.449,
    120,
    "Геймерская ягодная версия."
  ),
  D(
    "Adrenaline Rush",
    "Game Fuel",
    "Adrenaline Red",
    "Красные ягоды",
    0.449,
    120,
    "Красные ягоды."
  ),

  // ─── Flash Up ───
  D(
    "Flash Up",
    null,
    "Flash Up Energy",
    "Оригинал",
    0.45,
    75,
    "Бюджетная классика."
  ),
  D(
    "Flash Up",
    null,
    "Flash Up Wildberry",
    "Лесные ягоды",
    0.45,
    75,
    "Лесные ягоды."
  ),
  D("Flash Up", null, "Flash Up Zero", "Без сахара", 0.45, 75, "Ноль сахара."),
  D("Flash Up", null, "Flash Up Mojito", "Мохито", 0.45, 75, "Мятный мохито."),
  D("Flash Up", null, "Flash Up Cola", "Кола", 0.45, 75, "Кола-вкус."),

  // ─── Gorilla ───
  D(
    "Gorilla",
    null,
    "Gorilla",
    "Оригинал",
    0.45,
    90,
    "Плотный классический вкус."
  ),
  D("Gorilla", null, "Gorilla Mango", "Манго", 0.45, 90, "Спелое манго."),
  D(
    "Gorilla",
    null,
    "Gorilla Energy Berry",
    "Ягода",
    0.45,
    90,
    "Ягодный микс."
  ),
  D(
    "Gorilla",
    null,
    "Gorilla Blueberry",
    "Черника-лёд",
    0.45,
    90,
    "Черника со льдом."
  ),
  D("Gorilla", null, "Gorilla Cherry", "Вишня", 0.45, 90, "Вишнёвый."),

  // ─── Burn ───
  D("Burn", null, "Burn", "Оригинал", 0.449, 110, "Пряный классический Burn."),
  D("Burn", null, "Burn Mango", "Манго", 0.449, 110, "Манго."),
  D(
    "Burn",
    null,
    "Burn Apple-Kiwi",
    "Яблоко-киви",
    0.449,
    110,
    "Яблоко и киви."
  ),
  D("Burn", null, "Burn Zero", "Без сахара", 0.449, 110, "Ноль сахара."),
  D(
    "Burn",
    null,
    "Burn Dark Energy",
    "Тёмные ягоды",
    0.449,
    110,
    "Тёмный ягодный профиль."
  ),

  // ─── Drive Me ───
  D("Drive Me", null, "Drive Me", "Оригинал", 0.449, 100, "Ровная классика."),
  D(
    "Drive Me",
    null,
    "Drive Me Mango-Maracuja",
    "Манго-маракуйя",
    0.449,
    100,
    "Манго и маракуйя."
  ),
  D("Drive Me", null, "Drive Me Zero", "Без сахара", 0.449, 100, "Без сахара."),

  // ─── Tornado ───
  D("Tornado", null, "Tornado Energy", "Оригинал", 0.45, 85, "Дешёвый и злой."),
  D("Tornado", null, "Tornado Cherry", "Вишня", 0.45, 85, "Вишня."),
  D("Tornado", null, "Tornado Mojito", "Мохито", 0.45, 85, "Мохито."),
  D(
    "Tornado",
    null,
    "Tornado Storm",
    "Ягодный шторм",
    0.45,
    85,
    "Ягодный микс."
  ),

  // ─── E-ON ───
  D("E-ON", null, "E-ON", "Оригинал", 0.449, 95, "Классический E-ON."),
  D(
    "E-ON",
    null,
    "E-ON Mango-Maracuja",
    "Манго-маракуйя",
    0.449,
    95,
    "Манго и маракуйя."
  ),
  D(
    "E-ON",
    null,
    "E-ON Barberry",
    "Барбарис",
    0.449,
    95,
    "Ностальгический барбарис."
  ),
  D("E-ON", null, "E-ON Litchi", "Личи", 0.449, 95, "Экзотическое личи."),

  // ─── Jaguar ───
  D(
    "Jaguar",
    null,
    "Jaguar Line",
    "Оригинал",
    0.45,
    95,
    "Слабоалкогольный энергетик, классика."
  ),
  D(
    "Jaguar",
    null,
    "Jaguar Super",
    "Крепкий",
    0.45,
    95,
    "Более крепкая версия."
  ),
  D("Jaguar", null, "Jaguar Mango", "Манго", 0.45, 95, "Манго."),

  // ─── Volt ───
  D("Volt", null, "Volt", "Оригинал", 0.5, 90, "Пол-литра классики."),
  D("Volt", null, "Volt Cranberry", "Клюква", 0.5, 90, "Кисловатая клюква."),
];
