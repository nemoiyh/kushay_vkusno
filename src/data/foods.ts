import type { Food } from "../types";

const u = (label: string, grams: number) => ({ label, grams });

export const FOODS: Food[] = [
  // Белок
  { id: "kur-grudka", name: "Куриная грудка варёная", cat: "Белок", kcal: 165, p: 31, f: 3.6, c: 0 },
  { id: "indeyka", name: "Грудка индейки", cat: "Белок", kcal: 114, p: 24, f: 1.5, c: 0 },
  { id: "govyadina", name: "Говядина тушёная", cat: "Белок", kcal: 232, p: 25.8, f: 13.9, c: 0 },
  { id: "losos", name: "Лосось запечённый", cat: "Белок", kcal: 208, p: 20, f: 13, c: 0 },
  { id: "treska", name: "Треска запечённая", cat: "Белок", kcal: 105, p: 20, f: 3, c: 0 },
  { id: "tunez", name: "Тунец консервированный", cat: "Белок", kcal: 116, p: 26, f: 1, c: 0 },
  { id: "krevetki", name: "Креветки отварные", cat: "Белок", kcal: 99, p: 24, f: 0.3, c: 0.2 },
  { id: "yaico", name: "Яйцо куриное", cat: "Белок", kcal: 155, p: 13, f: 11, c: 1.1, unit: u("1 шт", 55) },
  { id: "tofu", name: "Тофу", cat: "Белок", kcal: 76, p: 8, f: 4.8, c: 1.9 },
  { id: "fasol", name: "Фасоль красная варёная", cat: "Белок", kcal: 127, p: 8.7, f: 0.5, c: 22.8 },
  { id: "chechevitsa", name: "Чечевица варёная", cat: "Белок", kcal: 116, p: 9, f: 0.4, c: 20 },

  // Гарниры и крупы
  { id: "grechka", name: "Гречка варёная", cat: "Гарниры и крупы", kcal: 110, p: 4.2, f: 1.1, c: 21 },
  { id: "ris", name: "Рис варёный", cat: "Гарниры и крупы", kcal: 130, p: 2.7, f: 0.3, c: 28 },
  { id: "ovsyanka", name: "Овсянка на воде", cat: "Гарниры и крупы", kcal: 88, p: 3, f: 1.7, c: 15 },
  { id: "makarony", name: "Макароны отварные", cat: "Гарниры и крупы", kcal: 131, p: 5, f: 1.1, c: 25 },
  { id: "kartofel-otv", name: "Картофель отварной", cat: "Гарниры и крупы", kcal: 82, p: 2, f: 0.4, c: 17 },
  { id: "kartofel-zh", name: "Картофель жареный", cat: "Гарниры и крупы", kcal: 192, p: 2.8, f: 9.5, c: 23 },

  // Овощи
  { id: "ogurec", name: "Огурец свежий", cat: "Овощи", kcal: 15, p: 0.8, f: 0.1, c: 3 },
  { id: "pomidor", name: "Помидор", cat: "Овощи", kcal: 18, p: 0.9, f: 0.2, c: 3.9 },
  { id: "salat-list", name: "Салат листовой", cat: "Овощи", kcal: 15, p: 1.4, f: 0.2, c: 2.9 },
  { id: "salat-ovosh", name: "Овощной салат с маслом", cat: "Овощи", kcal: 90, p: 1.5, f: 7, c: 6 },
  { id: "brokkoli", name: "Брокколи", cat: "Овощи", kcal: 34, p: 2.8, f: 0.4, c: 6.6 },
  { id: "morkov", name: "Морковь", cat: "Овощи", kcal: 41, p: 0.9, f: 0.2, c: 9.6 },
  { id: "avokado", name: "Авокадо", cat: "Овощи", kcal: 160, p: 2, f: 15, c: 8.5, unit: u("1 шт", 150) },

  // Фрукты
  { id: "banan", name: "Банан", cat: "Фрукты", kcal: 89, p: 1.1, f: 0.3, c: 23, unit: u("1 шт", 120) },
  { id: "yabloko", name: "Яблоко", cat: "Фрукты", kcal: 52, p: 0.3, f: 0.2, c: 14, unit: u("1 шт", 180) },
  { id: "apelsin", name: "Апельсин", cat: "Фрукты", kcal: 47, p: 0.9, f: 0.1, c: 12, unit: u("1 шт", 200) },
  { id: "vinograd", name: "Виноград", cat: "Фрукты", kcal: 69, p: 0.7, f: 0.2, c: 18 },
  { id: "klubnika", name: "Клубника", cat: "Фрукты", kcal: 32, p: 0.7, f: 0.3, c: 7.7 },

  // Молочные
  { id: "tvorog-5", name: "Творог 5%", cat: "Молочные", kcal: 121, p: 17, f: 5, c: 1.8 },
  { id: "tvorog-0", name: "Творог обезжиренный", cat: "Молочные", kcal: 71, p: 16.5, f: 0.2, c: 1.3 },
  { id: "yogurt", name: "Греческий йогурт", cat: "Молочные", kcal: 97, p: 9, f: 5, c: 4 },
  { id: "kefir", name: "Кефир 1%", cat: "Молочные", kcal: 40, p: 3, f: 1, c: 4, unit: u("1 стакан", 250) },
  { id: "moloko", name: "Молоко 2,5%", cat: "Молочные", kcal: 52, p: 2.8, f: 2.5, c: 4.7, unit: u("1 стакан", 250) },
  { id: "syr", name: "Сыр российский", cat: "Молочные", kcal: 363, p: 24, f: 29, c: 0.3, unit: u("ломтик", 25) },
  { id: "mozzarella", name: "Моцарелла", cat: "Молочные", kcal: 280, p: 22, f: 22, c: 2 },

  // Хлеб и злаки
  { id: "hleb-ch", name: "Хлеб ржаной", cat: "Хлеб и злаки", kcal: 214, p: 6.6, f: 1.2, c: 41, unit: u("ломтик", 35) },
  { id: "hleb-b", name: "Хлеб пшеничный", cat: "Хлеб и злаки", kcal: 265, p: 9, f: 3.2, c: 49, unit: u("ломтик", 30) },
  { id: "granola", name: "Гранола", cat: "Хлеб и злаки", kcal: 471, p: 10, f: 20, c: 64 },

  // Готовые блюда
  { id: "borsch", name: "Борщ со сметаной", cat: "Готовые блюда", kcal: 49, p: 1.6, f: 2.2, c: 5.5, unit: u("1 тарелка", 300) },
  { id: "plov", name: "Плов с курицей", cat: "Готовые блюда", kcal: 190, p: 8, f: 7, c: 23 },
  { id: "pelmeni", name: "Пельмени отварные", cat: "Готовые блюда", kcal: 275, p: 11, f: 12, c: 29 },
  { id: "syrniki", name: "Сырники", cat: "Готовые блюда", kcal: 220, p: 15, f: 9, c: 20, unit: u("1 шт", 60) },
  { id: "omlet", name: "Омлет из 2 яиц", cat: "Готовые блюда", kcal: 154, p: 11, f: 11, c: 1.2 },
  { id: "kotleta", name: "Котлета куриная", cat: "Готовые блюда", kcal: 222, p: 18, f: 13, c: 8, unit: u("1 шт", 90) },
  { id: "shaurma", name: "Шаурма классическая", cat: "Готовые блюда", kcal: 250, p: 10, f: 12, c: 24 },
  { id: "pizza", name: "Пицца маргарита", cat: "Готовые блюда", kcal: 266, p: 11, f: 10, c: 33, unit: u("кусок", 110) },
  { id: "burger", name: "Бургер с говядиной", cat: "Готовые блюда", kcal: 295, p: 15, f: 14, c: 27 },
  { id: "fri", name: "Картофель фри", cat: "Готовые блюда", kcal: 312, p: 3.4, f: 15, c: 41 },
  { id: "hummus", name: "Хумус", cat: "Готовые блюда", kcal: 166, p: 8, f: 9.6, c: 14 },

  // Орехи и жиры
  { id: "gretskie", name: "Орехи грецкие", cat: "Орехи и жиры", kcal: 654, p: 15, f: 65, c: 14, unit: u("горсть", 30) },
  { id: "mindal", name: "Миндаль", cat: "Орехи и жиры", kcal: 579, p: 21, f: 50, c: 22, unit: u("горсть", 30) },
  { id: "arahis-pasta", name: "Арахисовая паста", cat: "Орехи и жиры", kcal: 588, p: 25, f: 50, c: 20, unit: u("1 ст. л.", 20) },
  { id: "olivkovo", name: "Масло оливковое", cat: "Орехи и жиры", kcal: 884, p: 0, f: 100, c: 0, unit: u("1 ст. л.", 14) },
  { id: "slivochno", name: "Масло сливочное", cat: "Орехи и жиры", kcal: 717, p: 0.9, f: 81, c: 0.8, unit: u("1 ч. л.", 7) },

  // Сладкое
  { id: "shokolad", name: "Шоколад тёмный", cat: "Сладкое", kcal: 546, p: 5, f: 31, c: 61, unit: u("долька", 10) },
  { id: "med", name: "Мёд", cat: "Сладкое", kcal: 304, p: 0.3, f: 0, c: 82, unit: u("1 ч. л.", 12) },
  { id: "pechenye", name: "Печенье овсяное", cat: "Сладкое", kcal: 437, p: 7, f: 13, c: 72, unit: u("1 шт", 30) },
  { id: "zefir", name: "Зефир", cat: "Сладкое", kcal: 326, p: 0.8, f: 0, c: 79, unit: u("1 шт", 40) },
  { id: "sahar", name: "Сахар", cat: "Сладкое", kcal: 387, p: 0, f: 0, c: 100, unit: u("1 ч. л.", 5) },

  // Напитки
  { id: "sok", name: "Сок апельсиновый", cat: "Напитки", kcal: 45, p: 0.7, f: 0.1, c: 10.4, unit: u("1 стакан", 250) },
  { id: "cola", name: "Кола", cat: "Напитки", kcal: 42, p: 0, f: 0, c: 10.6, unit: u("1 банка", 330) },
  { id: "kofe-mol", name: "Кофе с молоком", cat: "Напитки", kcal: 40, p: 2, f: 1.5, c: 4.5, unit: u("1 кружка", 250) },
  { id: "cappuchino", name: "Капучино", cat: "Напитки", kcal: 56, p: 3, f: 3.2, c: 4, unit: u("1 кружка", 300) },
  { id: "pivo", name: "Пиво светлое", cat: "Напитки", kcal: 43, p: 0.5, f: 0, c: 3.6, unit: u("1 бокал", 500) },
  { id: "vino", name: "Вино сухое", cat: "Напитки", kcal: 83, p: 0.1, f: 0, c: 2.6, unit: u("1 бокал", 150) },
  { id: "proteini", name: "Протеиновый коктейль", cat: "Напитки", kcal: 52, p: 10, f: 1, c: 2, unit: u("1 порция", 300) },
];

export const CATS = Array.from(new Set(FOODS.map((f) => f.cat)));

export const findFood = (id: string | undefined) => FOODS.find((f) => f.id === id);
