import mongoose from 'mongoose';
import '../src/config/env.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';

/**
 * Full Store Catalog Seeder
 * Populates 8 authentic products with high-quality photos, proper brands,
 * realistic prices, PID / Item CD codes, and specifications for ALL categories.
 */

// Category Definitions & Product Templates for all 51 leaf categories
const CATEGORY_GENERATORS = {
  'branded-laptop': {
    brands: ['ACER', 'HP', 'DELL', 'LENOVO', 'ASUS', 'MSI'],
    images: [
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=80',
    ],
    items: [
      { brand: 'ACER', name: 'Acer Laptop Ryzen 3 5300U 8GB | 256 SSD | 15.6" FHD WIN 11 (Aspire 3) without Bag', price: 37908, dealer: 34500, specs: { Processor: 'AMD Ryzen 3 5300U', RAM: '8GB DDR4', Storage: '256GB SSD', Screen: '15.6" FHD' } },
      { brand: 'ACER', name: 'Acer Laptop Ryzen 3 7320U 8GB | 256 SSD | 15.6" FHD WIN 11 (UN.37DSI.003 One Notebook)', price: 39061, dealer: 35800, specs: { Processor: 'AMD Ryzen 3 7320U', RAM: '8GB LPDDR5', Storage: '256GB SSD', Screen: '15.6" FHD' } },
      { brand: 'HP', name: 'HP Laptop Core5-100U 250R G10-D43HXAT Silver (8GB | 512GB | 15.6 | DOS | Without Bag)', price: 67441, dealer: 62000, specs: { Processor: 'Intel Core 5 100U', RAM: '8GB DDR4', Storage: '512GB SSD', Screen: '15.6" FHD' } },
      { brand: 'DELL', name: 'Dell Laptop PRO 15 ESSENTIAL PV15250 INTEL CORE 3-100U (8GB | 512GB | 15.6 | FHD | DOS)', price: 49613, dealer: 45200, specs: { Processor: 'Intel Core 3 100U', RAM: '8GB DDR4', Storage: '512GB SSD', Screen: '15.6" FHD' } },
      { brand: 'HP', name: 'HP Laptop Core3-100U 250 G10-C91W6AT Silver (8GB | 512GB | 15.6 | DOS | Without Bag)', price: 47996, dealer: 43800, specs: { Processor: 'Intel Core 3 100U', RAM: '8GB DDR4', Storage: '512GB SSD', Screen: '15.6" FHD' } },
      { brand: 'HP', name: 'HP Laptop i3 14th Gen 15-fd1253TU Silver (8GB | 512GB | 15.6 | Win 11 Home)', price: 43500, dealer: 39800, specs: { Processor: 'Intel Core i3 14th Gen', RAM: '8GB DDR5', Storage: '512GB SSD', Screen: '15.6" FHD' } },
      { brand: 'LENOVO', name: 'Lenovo IdeaPad Slim 3 Core i3 1215U (8GB | 512GB SSD | 15.6" FHD | Win 11 + MSO 21)', price: 38490, dealer: 35200, specs: { Processor: 'Intel Core i3 1215U', RAM: '8GB DDR4', Storage: '512GB SSD', Screen: '15.6" FHD' } },
      { brand: 'ASUS', name: 'Asus Vivobook 15 Core i5 1235U (16GB | 512GB NVMe SSD | 15.6" FHD | Win 11 | Quiet Blue)', price: 54990, dealer: 50200, specs: { Processor: 'Intel Core i5 1235U', RAM: '16GB DDR4', Storage: '512GB SSD', Screen: '15.6" FHD' } },
    ]
  },

  'branded-laptops': {
    brands: ['DELL', 'HP', 'LENOVO', 'ASUS'],
    images: ['https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'DELL', name: 'Dell Vostro 3520 Core i5 1235U (16GB RAM | 512GB SSD | 15.6" 120Hz FHD | Win 11)', price: 52990, dealer: 48500, specs: { Processor: 'Intel Core i5 12th Gen', RAM: '16GB', Storage: '512GB SSD' } },
      { brand: 'HP', name: 'HP 15s Ryzen 5 5500U (16GB RAM | 512GB SSD | 15.6" FHD | Windows 11)', price: 46990, dealer: 42900, specs: { Processor: 'AMD Ryzen 5 5500U', RAM: '16GB', Storage: '512GB SSD' } },
      { brand: 'LENOVO', name: 'Lenovo ThinkPad E14 Gen 5 Core i5 1335U (16GB | 512GB SSD | 14" WUXGA IPS | Win 11 Pro)', price: 68990, dealer: 63000, specs: { Processor: 'Intel Core i5 13th Gen', RAM: '16GB', Storage: '512GB SSD' } },
      { brand: 'ASUS', name: 'Asus ZenBook 14 OLED Intel Core Ultra 5 (16GB LPDDR5X | 1TB SSD | 14" 3K OLED 120Hz)', price: 94990, dealer: 86500, specs: { Processor: 'Intel Core Ultra 5', RAM: '16GB LPDDR5X', Storage: '1TB SSD' } },
      { brand: 'ACER', name: 'Acer Swift Go 14 AI OLED Intel Core Ultra 7 (16GB | 512GB SSD | 14" 2.8K OLED)', price: 84990, dealer: 77500, specs: { Processor: 'Intel Core Ultra 7', RAM: '16GB', Storage: '512GB SSD' } },
      { brand: 'HP', name: 'HP Pavilion Plus 14 Core i7 13700H (16GB LPDDR5 | 1TB SSD | 14" 2.8K OLED 120Hz)', price: 89990, dealer: 82000, specs: { Processor: 'Intel Core i7 13700H', RAM: '16GB', Storage: '1TB SSD' } },
      { brand: 'DELL', name: 'Dell Latitude 3440 Intel Core i5 1335U (16GB | 512GB SSD | 14" FHD | Ubuntu Linux)', price: 58500, dealer: 53500, specs: { Processor: 'Intel Core i5 13th Gen', RAM: '16GB', Storage: '512GB SSD' } },
      { brand: 'LENOVO', name: 'Lenovo V15 G4 AMD Ryzen 5 7520U (8GB | 512GB SSD | 15.6" FHD | Iron Grey)', price: 36990, dealer: 33800, specs: { Processor: 'AMD Ryzen 5 7520U', RAM: '8GB', Storage: '512GB SSD' } },
    ]
  },

  'ultrabooks': {
    brands: ['ASUS', 'LENOVO', 'DELL', 'HP'],
    images: ['https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'ASUS', name: 'Asus Zenbook S 13 OLED 1kg Ultra-lightweight (Intel Core Ultra 7 | 16GB | 1TB SSD)', price: 114990, dealer: 104500, specs: { Weight: '1.0 kg', Screen: '13.3" 2.8K OLED', RAM: '16GB' } },
      { brand: 'LENOVO', name: 'Lenovo ThinkPad X1 Carbon Gen 11 (Core i7 1365U | 16GB | 1TB SSD | 14" 2.8K OLED)', price: 154990, dealer: 141000, specs: { Weight: '1.12 kg', Screen: '14" OLED', RAM: '16GB' } },
      { brand: 'DELL', name: 'Dell XPS 13 9340 (Intel Core Ultra 7 155H | 16GB LPDDR5X | 512GB SSD | FHD+ InfinityEdge)', price: 139990, dealer: 127000, specs: { Weight: '1.19 kg', Screen: '13.4" FHD+', RAM: '16GB' } },
      { brand: 'HP', name: 'HP Spectre x360 2-in-1 Touch Laptop (Intel Core Ultra 7 | 16GB | 1TB SSD | 14" 2.8K OLED)', price: 149990, dealer: 136000, specs: { Form: '2-in-1 Convertible', Screen: '14" Touch OLED', RAM: '16GB' } },
      { brand: 'ACER', name: 'Acer Swift Edge 16 Ultra-Thin (AMD Ryzen 7 7840U | 16GB | 1TB SSD | 16" 3.2K 120Hz OLED)', price: 99990, dealer: 91000, specs: { Weight: '1.23 kg', Screen: '16" 3.2K OLED', RAM: '16GB' } },
      { brand: 'ASUS', name: 'Asus ExpertBook B9 Ultralight Business (Core i7 1355U | 32GB | 1TB SSD | 880g Magnesium)', price: 129990, dealer: 118000, specs: { Weight: '880 grams', Screen: '14" FHD IPS', RAM: '32GB' } },
      { brand: 'LENOVO', name: 'Lenovo Yoga Slim 7x Copilot+ Snapdragon X Elite (16GB | 1TB SSD | 14.5" 3K OLED 90Hz)', price: 135990, dealer: 123000, specs: { Processor: 'Snapdragon X Elite', Screen: '14.5" 3K OLED', RAM: '16GB' } },
      { brand: 'HP', name: 'HP Envy x360 14 Intel Core Ultra 5 (16GB RAM | 512GB SSD | 14" 2K OLED Touchscreen)', price: 89990, dealer: 81500, specs: { Screen: '14" 2K Touch', RAM: '16GB', Storage: '512GB SSD' } },
    ]
  },

  'rtx-gaming-laptops': {
    brands: ['ASUS', 'MSI', 'ACER', 'LENOVO', 'HP', 'DELL'],
    images: ['https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'ASUS', name: 'Asus TUF Gaming F15 Intel Core i7 13620H (16GB DDR5 | 512GB SSD | RTX 4060 8GB | 144Hz)', price: 99990, dealer: 91000, specs: { GPU: 'NVIDIA RTX 4060 8GB', RefreshRate: '144Hz', RAM: '16GB DDR5' } },
      { brand: 'ACER', name: 'Acer Nitro V 15 AMD Ryzen 7 7735HS (16GB DDR5 | 512GB SSD | RTX 4050 6GB | 144Hz FHD)', price: 76990, dealer: 69900, specs: { GPU: 'NVIDIA RTX 4050 6GB', RefreshRate: '144Hz', RAM: '16GB DDR5' } },
      { brand: 'MSI', name: 'MSI Katana 15 B13VFK Intel Core i7 13620H (16GB DDR5 | 1TB SSD | RTX 4060 8GB | 144Hz)', price: 104990, dealer: 95500, specs: { GPU: 'NVIDIA RTX 4060 8GB', Storage: '1TB NVMe', RAM: '16GB DDR5' } },
      { brand: 'LENOVO', name: 'Lenovo LOQ 15 Intel Core i5 13450HX (16GB DDR5 | 512GB SSD | RTX 4050 6GB | 144Hz 100% sRGB)', price: 78990, dealer: 71500, specs: { GPU: 'NVIDIA RTX 4050 6GB', Screen: '100% sRGB 144Hz', RAM: '16GB' } },
      { brand: 'HP', name: 'HP Omen 16 AMD Ryzen 7 7840HS (16GB DDR5 | 1TB SSD | RTX 4070 8GB | 165Hz QHD)', price: 124990, dealer: 113500, specs: { GPU: 'NVIDIA RTX 4070 8GB', Screen: '16.1" QHD 165Hz', RAM: '16GB' } },
      { brand: 'DELL', name: 'Dell G15 5530 Intel Core i7 13650HX (16GB DDR5 | 1TB SSD | RTX 4060 8GB | 165Hz sRGB)', price: 108990, dealer: 99000, specs: { GPU: 'NVIDIA RTX 4060 8GB', Storage: '1TB NVMe SSD', RAM: '16GB DDR5' } },
      { brand: 'ASUS', name: 'Asus ROG Strix G16 Intel Core i7 13650HX (16GB DDR5 | 1TB SSD | RTX 4070 8GB | 165Hz ROG Nebula)', price: 149990, dealer: 136000, specs: { GPU: 'NVIDIA RTX 4070 8GB', Display: 'ROG Nebula 165Hz', RAM: '16GB' } },
      { brand: 'MSI', name: 'MSI Vector GP68HX Core i9 13950HX (32GB DDR5 | 1TB SSD | RTX 4080 12GB | 240Hz QHD+)', price: 219990, dealer: 199000, specs: { GPU: 'NVIDIA RTX 4080 12GB', Display: '240Hz QHD+', RAM: '32GB DDR5' } },
    ]
  },

  'rxg-20': {
    brands: ['ASUS', 'ACER', 'LENOVO', 'HP'],
    images: ['https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'ACER', name: 'Acer Aspire 7 Intel Core i5 12450H (16GB | 512GB SSD | RTX 2050 4GB | 15.6" 144Hz)', price: 52990, dealer: 48000, specs: { GPU: 'RTX 2050 4GB', RAM: '16GB', Screen: '144Hz FHD' } },
      { brand: 'ASUS', name: 'Asus TUF Gaming A15 AMD Ryzen 5 7535HS (8GB DDR5 | 512GB SSD | RTX 2050 4GB | 144Hz)', price: 54990, dealer: 49800, specs: { GPU: 'RTX 2050 4GB', RAM: '8GB DDR5', Screen: '144Hz FHD' } },
      { brand: 'LENOVO', name: 'Lenovo IdeaPad Gaming 3 Ryzen 5 5500H (8GB | 512GB SSD | RTX 2050 4GB | 120Hz IPS)', price: 47990, dealer: 43500, specs: { GPU: 'RTX 2050 4GB', RAM: '8GB', Screen: '120Hz IPS' } },
      { brand: 'HP', name: 'HP Victus 15 AMD Ryzen 5 5600H (8GB DDR4 | 512GB SSD | RTX 2050 4GB | 144Hz FHD)', price: 53490, dealer: 48900, specs: { GPU: 'RTX 2050 4GB', RAM: '8GB', Screen: '144Hz FHD' } },
      { brand: 'ASUS', name: 'Asus Vivobook Pro 15 OLED Ryzen 5 (16GB | 512GB SSD | RTX 2050 4GB | OLED 2.8K)', price: 62990, dealer: 57000, specs: { GPU: 'RTX 2050 4GB', Screen: '2.8K OLED', RAM: '16GB' } },
      { brand: 'ACER', name: 'Acer Extensa 15 Core i5 1240P (16GB | 512GB SSD | RTX 2050 4GB Graphics)', price: 51990, dealer: 47200, specs: { GPU: 'RTX 2050 4GB', RAM: '16GB', Storage: '512GB SSD' } },
      { brand: 'LENOVO', name: 'Lenovo V15 G4 Core i5 13420H (16GB | 512GB SSD | Dedicated 4GB RTX Series Graphics)', price: 54990, dealer: 50000, specs: { GPU: 'RTX 2050 4GB', RAM: '16GB', OS: 'DOS' } },
      { brand: 'HP', name: 'HP Pavilion Gaming 15 Core i5 11400H (8GB | 512GB SSD | RTX 2050 4GB | Shadow Black)', price: 49990, dealer: 45500, specs: { GPU: 'RTX 2050 4GB', RAM: '8GB', Screen: '144Hz' } },
    ]
  },

  'rxg-30': {
    brands: ['ASUS', 'LENOVO', 'HP', 'DELL'],
    images: ['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'ASUS', name: 'Asus TUF Gaming F15 Core i5 11400H (16GB RAM | 512GB SSD | RTX 3050 4GB | 144Hz)', price: 58990, dealer: 53500, specs: { GPU: 'RTX 3050 4GB', RAM: '16GB', Screen: '144Hz' } },
      { brand: 'LENOVO', name: 'Lenovo LOQ Intel Core i5 12450HX (16GB DDR5 | 512GB SSD | RTX 3050 6GB 95W TGP)', price: 62990, dealer: 57200, specs: { GPU: 'RTX 3050 6GB 95W', RAM: '16GB DDR5', Screen: '144Hz FHD' } },
      { brand: 'HP', name: 'HP Victus Gaming Core i5 12450H (16GB DDR4 | 512GB SSD | RTX 3050 4GB | 144Hz)', price: 64990, dealer: 59000, specs: { GPU: 'RTX 3050 4GB', RAM: '16GB', Screen: '144Hz' } },
      { brand: 'DELL', name: 'Dell G15 5520 Core i5 12500H (16GB DDR5 | 512GB SSD | RTX 3050 4GB | Dark Shadow Grey)', price: 69990, dealer: 63500, specs: { GPU: 'RTX 3050 4GB', RAM: '16GB DDR5', Screen: '120Hz' } },
      { brand: 'ACER', name: 'Acer Nitro 5 Core i5 12500H (16GB DDR4 | 512GB SSD | RTX 3050 Ti 4GB | 144Hz RGB)', price: 63990, dealer: 58000, specs: { GPU: 'RTX 3050 Ti 4GB', RAM: '16GB', Screen: '144Hz RGB' } },
      { brand: 'MSI', name: 'MSI Thin GF63 Core i7 12650H (16GB RAM | 512GB SSD | RTX 3050 4GB | 144Hz)', price: 65990, dealer: 59900, specs: { GPU: 'RTX 3050 4GB', Processor: 'Core i7 12th', RAM: '16GB' } },
      { brand: 'ASUS', name: 'Asus ROG Strix G15 AMD Ryzen 7 6800H (16GB DDR5 | 512GB SSD | RTX 3050 4GB | 144Hz)', price: 74990, dealer: 68000, specs: { GPU: 'RTX 3050 4GB', RAM: '16GB DDR5', Screen: '144Hz' } },
      { brand: 'LENOVO', name: 'Lenovo IdeaPad Gaming 3 Core i5 11320H (16GB RAM | 512GB SSD | RTX 3050 4GB 85W TGP)', price: 59990, dealer: 54500, specs: { GPU: 'RTX 3050 4GB', RAM: '16GB', Screen: '120Hz IPS' } },
    ]
  },

  'rxg-40': {
    brands: ['ASUS', 'MSI', 'LENOVO', 'HP', 'DELL'],
    images: ['https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'ASUS', name: 'Asus TUF Gaming A15 AMD Ryzen 7 7735HS (16GB DDR5 | 512GB SSD | RTX 4050 6GB 140W)', price: 82990, dealer: 75500, specs: { GPU: 'RTX 4050 6GB', RAM: '16GB DDR5', Screen: '144Hz' } },
      { brand: 'LENOVO', name: 'Lenovo Legion 5 Pro Core i7 13700HX (16GB DDR5 | 1TB SSD | RTX 4060 8GB | 240Hz WQXGA)', price: 139990, dealer: 127000, specs: { GPU: 'RTX 4060 8GB', Screen: '16" WQXGA 240Hz', RAM: '16GB' } },
      { brand: 'MSI', name: 'MSI Cyborg 15 Intel Core i7 12650H (16GB DDR5 | 512GB SSD | RTX 4060 8GB | Translucent Black)', price: 88990, dealer: 80800, specs: { GPU: 'RTX 4060 8GB', RAM: '16GB DDR5', Screen: '144Hz' } },
      { brand: 'HP', name: 'HP Omen 16 Intel Core i7 13700HX (16GB DDR5 | 1TB SSD | RTX 4060 8GB | 165Hz FHD IPS)', price: 114990, dealer: 104500, specs: { GPU: 'RTX 4060 8GB', Storage: '1TB SSD', RAM: '16GB' } },
      { brand: 'DELL', name: 'Dell Alienware m16 R2 Intel Core Ultra 7 155H (16GB DDR5 | 1TB SSD | RTX 4070 8GB 140W)', price: 179990, dealer: 163000, specs: { GPU: 'RTX 4070 8GB', Screen: '16" QHD+ 240Hz', RAM: '16GB' } },
      { brand: 'ACER', name: 'Acer Predator Helios Neo 16 Core i7 13700HX (16GB DDR5 | 1TB SSD | RTX 4060 8GB 140W)', price: 119990, dealer: 109000, specs: { GPU: 'RTX 4060 8GB', Screen: '16" WUXGA 165Hz', RAM: '16GB' } },
      { brand: 'ASUS', name: 'Asus ROG Zephyrus G16 OLED Intel Core Ultra 9 (32GB LPDDR5X | 1TB SSD | RTX 4070 8GB)', price: 199990, dealer: 181000, specs: { GPU: 'RTX 4070 8GB', Screen: '16" 2.5K OLED 240Hz', RAM: '32GB' } },
      { brand: 'LENOVO', name: 'Lenovo LOQ 15 AMD Ryzen 7 7840HS (16GB DDR5 | 512GB SSD | RTX 4060 8GB 115W TGP)', price: 89990, dealer: 81800, specs: { GPU: 'RTX 4060 8GB', Processor: 'Ryzen 7 7840HS', RAM: '16GB' } },
    ]
  },

  'rxg-50': {
    brands: ['ASUS', 'MSI', 'LENOVO', 'DELL'],
    images: ['https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'ASUS', name: 'Asus ROG Strix SCAR 18 Core i9 14900HX (32GB DDR5 | 2TB SSD | RTX 4080 12GB | 2.5K 240Hz)', price: 289990, dealer: 263000, specs: { GPU: 'RTX 4080 12GB', Processor: 'Core i9 14900HX', RAM: '32GB DDR5' } },
      { brand: 'MSI', name: 'MSI Titan 18 HX Core i9 14900HX (64GB DDR5 | 4TB NVMe SSD | RTX 4090 16GB 175W Mini-LED)', price: 449990, dealer: 408000, specs: { GPU: 'RTX 4090 16GB', RAM: '64GB DDR5', Screen: '18" 4K 120Hz Mini-LED' } },
      { brand: 'LENOVO', name: 'Lenovo Legion Pro 7i Core i9 14900HX (32GB DDR5 | 1TB SSD | RTX 4080 12GB 175W | 240Hz)', price: 269990, dealer: 245000, specs: { GPU: 'RTX 4080 12GB', Screen: '16" WQXGA 240Hz', RAM: '32GB' } },
      { brand: 'DELL', name: 'Dell Alienware m18 R2 Intel Core i9 14900HX (32GB DDR5 | 2TB SSD | RTX 4090 16GB 175W)', price: 399990, dealer: 362000, specs: { GPU: 'RTX 4090 16GB', Screen: '18" QHD+ 165Hz', RAM: '32GB' } },
      { brand: 'ASUS', name: 'Asus ROG Zephyrus M16 Core i9 13900H (32GB DDR5 | 2TB SSD | RTX 4090 16GB Mini LED AniMe Matrix)', price: 349990, dealer: 317000, specs: { GPU: 'RTX 4090 16GB', Display: 'Mini LED QHD+ 240Hz', RAM: '32GB' } },
      { brand: 'MSI', name: 'MSI Raider GE78 HX Core i9 13980HX (32GB DDR5 | 2TB SSD | RTX 4080 12GB Matrix Lightbar)', price: 274990, dealer: 249000, specs: { GPU: 'RTX 4080 12GB', Screen: '17" QHD+ 240Hz', RAM: '32GB' } },
      { brand: 'ACER', name: 'Acer Predator Helios 18 Core i9 14900HX (32GB DDR5 | 2TB SSD | RTX 4080 12GB MagClick)', price: 259990, dealer: 236000, specs: { GPU: 'RTX 4080 12GB', Screen: '18" WQXGA 250Hz', RAM: '32GB' } },
      { brand: 'LENOVO', name: 'Lenovo Legion 9i Core i9 13980HX Liquid Cooled (64GB DDR5 | 2TB SSD | RTX 4090 16GB 3.2K Mini-LED)', price: 419990, dealer: 381000, specs: { GPU: 'RTX 4090 16GB', Cooling: 'Integrated Liquid Cooling', RAM: '64GB' } },
    ]
  },

  // Laptop Parts & Spares
  'laptop-battery': {
    brands: ['DELL', 'HP', 'LENOVO', 'ACER', 'ASUS'],
    images: ['https://images.unsplash.com/photo-1619725002198-6a689b72f41d?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'DELL', name: 'Dell 3-Cell 42Wh Original Battery WDX0R for Inspiron 5567 5568 5378 7378', price: 2850, dealer: 2400, specs: { Capacity: '42Wh', Voltage: '11.4V', Cells: '3-Cell Li-ion' } },
      { brand: 'HP', name: 'HP HT03XL Original 41Wh Laptop Battery for HP 240 250 G7 Pavilion 14-ce 15-cs', price: 2650, dealer: 2200, specs: { Capacity: '41.04Wh', Voltage: '11.55V', Cells: '3-Cell' } },
      { brand: 'LENOVO', name: 'Lenovo L16M2PB2 Original Battery for IdeaPad 320 330 520 V320', price: 2450, dealer: 2100, specs: { Capacity: '30Wh', Voltage: '7.4V', Cells: '2-Cell' } },
      { brand: 'ACER', name: 'Acer AC14B18J 36Wh Battery for Aspire 3 A315 Nitro 5 AN515 Chromebook 15', price: 2350, dealer: 1950, specs: { Capacity: '36Wh', Voltage: '11.4V', Cells: '3-Cell' } },
      { brand: 'DELL', name: 'Dell G-Series 56Wh 4-Cell Laptop Battery 33YDH for G3 3579 G5 5587 Inspiron 7577', price: 3450, dealer: 2950, specs: { Capacity: '56Wh', Voltage: '15.2V', Cells: '4-Cell Li-ion' } },
      { brand: 'HP', name: 'HP TF03XL 3-Cell 41.9Wh Battery for Pavilion 14-BF 15-CC 15-CD 17-AR Series', price: 2750, dealer: 2300, specs: { Capacity: '41.9Wh', Voltage: '11.55V', Cells: '3-Cell' } },
      { brand: 'ASUS', name: 'Asus B31N1726 42Wh Original Battery for Vivobook 14 15 X411 X510 FX505', price: 2890, dealer: 2450, specs: { Capacity: '42Wh', Voltage: '11.52V', Cells: '3-Cell' } },
      { brand: 'LENOVO', name: 'Lenovo ThinkPad 48Wh Internal Battery 01AV423 for T470 T480 T25 Series', price: 3650, dealer: 3100, specs: { Capacity: '48Wh', Voltage: '11.46V', Cells: '3-Cell' } },
    ]
  },

  'laptop-adaptor': {
    brands: ['HP', 'DELL', 'LENOVO', 'ACER', 'ASUS'],
    images: ['https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'HP', name: 'HP 65W Blue Pin 4.5mm Original Smart AC Adapter Charger for HP Laptops', price: 1450, dealer: 1150, specs: { Output: '19.5V 3.33A 65W', Connector: '4.5mm x 3.0mm Blue Pin' } },
      { brand: 'DELL', name: 'Dell 65W Small Pin 4.5mm Genuine Power Adapter for Inspiron Vostro Series', price: 1490, dealer: 1200, specs: { Output: '19.5V 3.34A 65W', Connector: '4.5mm x 3.0mm Small Pin' } },
      { brand: 'LENOVO', name: 'Lenovo 65W Round Pin 4.0mm AC Adapter for IdeaPad Slim 3 5 330 320', price: 1390, dealer: 1100, specs: { Output: '20V 3.25A 65W', Connector: '4.0mm x 1.7mm Round Pin' } },
      { brand: 'DELL', name: 'Dell 65W USB-C Type-C Genuine Laptop Charger Adapter for Latitude XPS', price: 2450, dealer: 1950, specs: { Output: 'Type-C PD 65W 20V 3.25A', Connector: 'USB Type-C' } },
      { brand: 'HP', name: 'HP 65W USB-C Power Adapter Genuine Fast Charger for ProBook EliteBook', price: 2390, dealer: 1900, specs: { Output: 'USB-C PD 65W', Connector: 'Type-C Reversible' } },
      { brand: 'LENOVO', name: 'Lenovo 65W Type-C Standard Original AC Adapter for ThinkPad IdeaPad', price: 2250, dealer: 1800, specs: { Output: '20V 3.25A Type-C 65W', Connector: 'USB-C' } },
      { brand: 'ACER', name: 'Acer 65W 19V 3.42A AC Adapter Charger for Aspire 3 5 Swift 3 Spin 3', price: 1290, dealer: 1050, specs: { Output: '19V 3.42A 65W', Connector: '3.0mm x 1.1mm / 5.5mm' } },
      { brand: 'ASUS', name: 'Asus 120W Gaming Laptop Charger for TUF Gaming FX505 FX506 ROG Strix', price: 3200, dealer: 2700, specs: { Output: '20V 6.0A 120W', Connector: '6.0mm x 3.7mm Center Pin' } },
    ]
  },

  'laptop-ram': {
    brands: ['CRUCIAL', 'KINGSTON', 'SAMSUNG', 'CORSAIR'],
    images: ['https://images.unsplash.com/photo-1562976540-1502c2145186?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'CRUCIAL', name: 'Crucial 8GB DDR4 3200MHz SODIMM Laptop Memory Module CT8G4SFRA32A', price: 1690, dealer: 1350, specs: { Capacity: '8GB', Speed: '3200MHz DDR4', FormFactor: 'SODIMM 260-Pin' } },
      { brand: 'CRUCIAL', name: 'Crucial 16GB DDR4 3200MHz SODIMM High Performance Laptop RAM CT16G4SFRA32A', price: 2990, dealer: 2450, specs: { Capacity: '16GB', Speed: '3200MHz DDR4', FormFactor: 'SODIMM 260-Pin' } },
      { brand: 'CRUCIAL', name: 'Crucial 16GB DDR5 4800MHz SODIMM Laptop RAM Memory CT16G48C40S5', price: 4290, dealer: 3600, specs: { Capacity: '16GB', Speed: '4800MHz DDR5', FormFactor: 'SODIMM 262-Pin' } },
      { brand: 'CRUCIAL', name: 'Crucial 16GB DDR5 5600MHz SODIMM Laptop Memory Module CT16G56C46S5', price: 4690, dealer: 3950, specs: { Capacity: '16GB', Speed: '5600MHz DDR5', FormFactor: 'SODIMM 262-Pin' } },
      { brand: 'KINGSTON', name: 'Kingston FURY Impact 16GB DDR4 3200MHz CL20 Gaming Laptop RAM KF432S20IB/16', price: 3350, dealer: 2750, specs: { Capacity: '16GB', Speed: '3200MHz DDR4', Latency: 'CL20' } },
      { brand: 'SAMSUNG', name: 'Samsung 8GB DDR4 3200MHz SODIMM Original Laptop Memory Module', price: 1750, dealer: 1400, specs: { Capacity: '8GB', Speed: '3200MHz DDR4', Type: '1Rx8 PC4-25600' } },
      { brand: 'SAMSUNG', name: 'Samsung 16GB DDR5 4800MHz SODIMM Laptop Memory Module M425R2GA3BB0', price: 4450, dealer: 3750, specs: { Capacity: '16GB', Speed: '4800MHz DDR5', Type: 'PC5-38400' } },
      { brand: 'CORSAIR', name: 'Corsair Vengeance 32GB (2x16GB) DDR4 3200MHz SODIMM Laptop Kit CMSX32GX4M2A3200C22', price: 6850, dealer: 5800, specs: { Capacity: '32GB Kit (2x16GB)', Speed: '3200MHz DDR4', Type: 'Dual Channel Kit' } },
    ]
  },

  'laptop-cooling-pad': {
    brands: ['ZEBRONICS', 'PORTRONICS', 'DEEPCOOL', 'COSMIC BYTE'],
    images: ['https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'ZEBRONICS', name: 'Zebronics ZEB-NC3300 Dual 120mm Fan Laptop Cooling Pad with Blue LED & Dual USB', price: 899, dealer: 650, specs: { Fans: 'Dual 120mm LED', Compatibility: 'Up to 15.6" Laptop', USBPorts: '2' } },
      { brand: 'PORTRONICS', name: 'Portronics My Buddy K Plus Adjustable Laptop Stand with Dual Cooling Fan', price: 1199, dealer: 890, specs: { Material: 'Aluminium Alloy', Fans: 'Dual Silent Fans', Ergonomics: 'Multi-angle Adjustable' } },
      { brand: 'COSMIC BYTE', name: 'Cosmic Byte Asteroid RGB 5-Fan Laptop Cooling Pad for Gaming Laptops up to 17"', price: 1899, dealer: 1450, specs: { Fans: '5 High Speed Fans', Lighting: '7 RGB Modes', ScreenSize: 'Up to 17.3"' } },
      { brand: 'DEEPCOOL', name: 'DeepCool N80 RGB Dual 140mm Silent Fan Metal Mesh Laptop Cooling Pad', price: 2499, dealer: 1950, specs: { Fans: 'Dual 140mm Hydro Bearing', Lighting: 'Addressable RGB', Surface: 'Pure Aluminium Panel' } },
      { brand: 'ZEBRONICS', name: 'Zebronics NC9000 Pro Quad Fan Laptop Cooling Pad with Phone Holder', price: 1499, dealer: 1100, specs: { Fans: '4 High RPM Fans', Extras: 'Detachable Phone Holder', USB: 'Dual Pass-Through' } },
      { brand: 'PORTRONICS', name: 'Portronics My Buddy Hexa 22 Ergonomic Laptop Cooling Stand with 360 Rotation', price: 999, dealer: 750, specs: { Rotation: '360 Degree Swivel', Material: 'ABS + Metal Mesh', Compatibility: '11 to 17 inch' } },
      { brand: 'COSMIC BYTE', name: 'Cosmic Byte Meteoroid Dual 140mm Fan Laptop Cooler with Digital Fan Speed Controller', price: 1649, dealer: 1250, specs: { Fans: '2 x 140mm Fans', Control: 'Digital LCD Display', USB: '2 x USB 2.0' } },
      { brand: 'ZEBRONICS', name: 'Zebronics NC1200 Single 140mm Silent Blue LED Laptop Cooling Pad', price: 649, dealer: 480, specs: { Fans: 'Single 140mm Fan', Weight: 'Lightweight Portable', Mesh: 'Full Metal Mesh' } },
    ]
  },

  'laptop-screen': {
    brands: ['LG', 'BOE', 'INNOLUX', 'AUO'],
    images: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'BOE', name: '15.6" Full HD 1920x1080 30-Pin EDP Slim LED Laptop Screen Display Panel NV156FHM-N48', price: 3450, dealer: 2950, specs: { Size: '15.6 Inch', Resolution: '1920x1080 FHD', Connector: '30-Pin EDP' } },
      { brand: 'INNOLUX', name: '14.0" Full HD 1920x1080 30-Pin EDP Slim IPS Laptop Screen Display Panel N140HCA-EAC', price: 3350, dealer: 2850, specs: { Size: '14.0 Inch', Resolution: '1920x1080 FHD IPS', Connector: '30-Pin EDP' } },
      { brand: 'LG', name: '15.6" 144Hz FHD 1920x1080 40-Pin EDP IPS Gaming Laptop Screen LP156WFG-SPB2', price: 5450, dealer: 4700, specs: { Size: '15.6 Inch', RefreshRate: '144Hz Gaming', Connector: '40-Pin EDP' } },
      { brand: 'BOE', name: '15.6" HD 1366x768 30-Pin EDP Slim Glare/Matte Laptop LED Screen Panel NT156WHM-N32', price: 2950, dealer: 2500, specs: { Size: '15.6 Inch', Resolution: '1366x768 HD', Connector: '30-Pin EDP' } },
      { brand: 'AUO', name: '14.0" HD 1366x768 30-Pin Slim LED Screen Display B140XTN02.4 for Dell HP Lenovo', price: 2850, dealer: 2400, specs: { Size: '14.0 Inch', Resolution: '1366x768 HD', Connector: '30-Pin EDP' } },
      { brand: 'LG', name: '15.6" 120Hz Full HD 40-Pin EDP IPS Replacement Screen for Dell G3 G5 Gaming', price: 4950, dealer: 4250, specs: { Size: '15.6 Inch', RefreshRate: '120Hz IPS', Connector: '40-Pin EDP' } },
      { brand: 'BOE', name: '14.0" 2K QHD 2560x1440 40-Pin IPS Laptop Display Screen Panel for ThinkPad T480s', price: 6200, dealer: 5350, specs: { Size: '14.0 Inch', Resolution: '2560x1440 2K QHD', Connector: '40-Pin EDP' } },
      { brand: 'INNOLUX', name: '17.3" Full HD 1920x1080 30-Pin EDP Anti-Glare Laptop Screen Panel N173HCE-E31', price: 5950, dealer: 5100, specs: { Size: '17.3 Inch', Resolution: '1920x1080 FHD', Connector: '30-Pin EDP' } },
    ]
  },

  'laptop-keyboard': {
    brands: ['DELL', 'HP', 'LENOVO', 'ACER', 'ASUS'],
    images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'DELL', name: 'Dell Inspiron 15 3511 3515 3520 Internal Laptop Keyboard Black with Frame', price: 950, dealer: 750, specs: { Layout: 'US English QWERTY', CompatibleWith: 'Inspiron 3511 3520' } },
      { brand: 'HP', name: 'HP 15-DA 15-DB 250 G7 255 G7 Internal Replacement Laptop Keyboard Black', price: 850, dealer: 680, specs: { Layout: 'US English', CompatibleWith: 'HP 15-DA 15-DB Series' } },
      { brand: 'LENOVO', name: 'Lenovo IdeaPad 320-15 330-15 520-15 Replacement Laptop Keyboard Grey Frame', price: 890, dealer: 700, specs: { Layout: 'US QWERTY', CompatibleWith: 'IdeaPad 320 330 Series' } },
      { brand: 'DELL', name: 'Dell Latitude 3490 3400 E5470 E7470 Backlit Internal Laptop Keyboard', price: 1450, dealer: 1150, specs: { Features: 'White Backlight', CompatibleWith: 'Latitude 3490 5470 7470' } },
      { brand: 'HP', name: 'HP Pavilion 15-CS 15-CW Silver Backlit Laptop Keyboard with Ribbon Cable', price: 1350, dealer: 1080, specs: { Color: 'Silver', Features: 'Backlit', CompatibleWith: 'Pavilion 15-CS' } },
      { brand: 'ACER', name: 'Acer Aspire 3 A315-42 A315-54 A315-56 A515-54 Internal Replacement Keyboard', price: 920, dealer: 720, specs: { Layout: 'US Standard', CompatibleWith: 'Aspire A315 A515' } },
      { brand: 'ASUS', name: 'Asus TUF Gaming FX505 FX505D FX505GE FX705 RGB Red Backlit Keyboard', price: 1650, dealer: 1300, specs: { Color: 'Black with Red/RGB Backlight', CompatibleWith: 'TUF Gaming FX505' } },
      { brand: 'LENOVO', name: 'Lenovo ThinkPad T470 T480 TrackPoint Internal Replacement Laptop Keyboard', price: 1850, dealer: 1450, specs: { Features: 'TrackPoint + Backlit', CompatibleWith: 'ThinkPad T470 T480' } },
    ]
  },

  'laptop-cpu-fan': {
    brands: ['DELL', 'HP', 'LENOVO', 'ACER', 'ASUS'],
    images: ['https://images.unsplash.com/photo-1597740985671-2a8a3b80532e?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'DELL', name: 'Dell Inspiron 15 3511 3515 3520 3521 CPU Cooling Fan 4-Pin 047RW6', price: 650, dealer: 450, specs: { Connector: '4-Pin PWM', Compatibility: 'Dell Inspiron 3511 3520' } },
      { brand: 'HP', name: 'HP 15-DA 15-DB 15-DX 250 G7 CPU Cooling Fan L20474-001 DFS541105FC0T', price: 590, dealer: 410, specs: { Connector: '4-Pin Header', Compatibility: 'HP 15-DA 250 G7' } },
      { brand: 'LENOVO', name: 'Lenovo IdeaPad 320-15 330-15 520-15 CPU Cooling Fan DFS541105FC0T', price: 620, dealer: 430, specs: { Voltage: 'DC 5V 0.5A', Compatibility: 'IdeaPad 320 330 Series' } },
      { brand: 'DELL', name: 'Dell G-Series G3 3590 G5 5590 Left & Right Dual Cooling Fan Set 04NYWG 0MV07R', price: 1450, dealer: 1100, specs: { Type: 'Dual CPU + GPU Fans', Compatibility: 'Dell G3 3590 G5 5590' } },
      { brand: 'HP', name: 'HP Pavilion 15-CS 15-CW Series CPU Cooling Fan L25584-001', price: 680, dealer: 480, specs: { Connector: '4-Pin Ultra-Quiet', Compatibility: 'Pavilion 15-CS' } },
      { brand: 'ACER', name: 'Acer Nitro 5 AN515-54 AN515-55 Predator Helios 300 CPU Cooling Fan DC28000QEF0', price: 850, dealer: 620, specs: { Bearing: 'Hydraulic Long Life', Compatibility: 'Nitro 5 AN515-54' } },
      { brand: 'ASUS', name: 'Asus TUF Gaming FX505 FX505D FX505GE CPU + GPU Dual Cooling Fan Set', price: 1650, dealer: 1250, specs: { DualFan: 'CPU Fan + GPU Fan 5V', Compatibility: 'TUF Gaming FX505' } },
      { brand: 'LENOVO', name: 'Lenovo ThinkPad T470 T480 Discrete Graphics CPU Heatsink with Cooling Fan 01YR200', price: 1850, dealer: 1400, specs: { Unit: 'Pure Copper Pipe + Fan', Compatibility: 'ThinkPad T480' } },
    ]
  },

  'laptop-hinges': {
    brands: ['DELL', 'HP', 'LENOVO', 'ACER', 'ASUS'],
    images: ['https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'DELL', name: 'Dell Inspiron 15 3511 3515 3520 Left and Right LCD Screen Hinges Set 070FGM 063T8M', price: 550, dealer: 380, specs: { Pair: 'Left + Right Hinges', Material: 'High-Tensile Zinc Steel' } },
      { brand: 'HP', name: 'HP 15-DA 15-DB 15-DX 250 G7 Left & Right LCD Screen Hinges Pair L20421-001', price: 490, dealer: 340, specs: { Pair: 'L + R Pair', Compatibility: 'HP 15-DA 250 G7' } },
      { brand: 'LENOVO', name: 'Lenovo IdeaPad 320-15 330-15 Left and Right LCD Display Hinges Set 5H50N86561', price: 520, dealer: 360, specs: { Pair: 'Full Hinge Set', Compatibility: 'IdeaPad 320 330' } },
      { brand: 'DELL', name: 'Dell Inspiron 15 5567 5565 5767 Left and Right Screen Hinges Bracket Set 0M5P14', price: 590, dealer: 410, specs: { Compatibility: 'Dell 5567 5565', Durability: 'Tested 25,000 Cycles' } },
      { brand: 'HP', name: 'HP Pavilion 15-CS 15-CW Silver Screen Hinges Left & Right Set L24754-001', price: 620, dealer: 430, specs: { Finish: 'Chrome Zinc Finish', Compatibility: 'Pavilion 15-CS' } },
      { brand: 'ACER', name: 'Acer Aspire 3 A315-42 A315-54 A315-56 LCD Screen Hinges Left and Right Pair', price: 540, dealer: 370, specs: { Pair: 'Left + Right Bracket', Compatibility: 'Aspire A315' } },
      { brand: 'ASUS', name: 'Asus Vivobook 15 X510 X510U S510 S510U Left and Right LCD Screen Hinges', price: 580, dealer: 400, specs: { Pair: 'Heavy Duty Metal', Compatibility: 'Vivobook X510 S510' } },
      { brand: 'LENOVO', name: 'Lenovo ThinkPad E480 E485 E490 E495 Heavy-Duty Steel Display Hinges Pair 01LW409', price: 750, dealer: 530, specs: { Grade: 'ThinkPad Enterprise Grade', Pair: 'Left & Right' } },
    ]
  },

  'laptop-speaker': {
    brands: ['DELL', 'HP', 'LENOVO', 'ASUS', 'ACER'],
    images: ['https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'DELL', name: 'Dell Inspiron 15 3521 3537 5521 5537 Left and Right Internal Speaker Set 0M8V5C', price: 550, dealer: 380, specs: { Channels: 'Left & Right Stereo', Compatibility: 'Dell 3521 5521 Series' } },
      { brand: 'HP', name: 'HP 15-BS 15-BW 250 G6 255 G6 Built-in Internal Speaker Pair 925307-001', price: 490, dealer: 350, specs: { Channels: 'L+R Pair', Compatibility: 'HP 250 G6 15-BS' } },
      { brand: 'LENOVO', name: 'Lenovo IdeaPad 3 15IML05 15ADA05 15IIL05 Internal Laptop Speaker Set PK23000WSY0', price: 580, dealer: 410, specs: { Type: 'Original OEM Pair', Compatibility: 'IdeaPad 3-15' } },
      { brand: 'DELL', name: 'Dell Inspiron 15 5567 5565 5767 Internal Speaker Set Replacement 028H88', price: 620, dealer: 450, specs: { Channels: 'Stereo Sound', Compatibility: 'Dell 5567 5565' } },
      { brand: 'HP', name: 'HP Pavilion 15-CS 15-CW B&O Bang & Olufsen Internal Audio Speaker Module', price: 690, dealer: 500, specs: { Audio: 'B&O Tuned Drivers', Compatibility: 'Pavilion 15-CS Series' } },
      { brand: 'ACER', name: 'Acer Nitro 5 AN515-51 AN515-52 AN515-53 Internal Speaker Pair 23.Q2CN2.002', price: 650, dealer: 470, specs: { Channels: 'Dual Chamber Drivers', Compatibility: 'Nitro 5 AN515' } },
      { brand: 'ASUS', name: 'Asus Vivobook 15 X510 X510U S510 S510U Built-in Laptop Audio Speakers', price: 590, dealer: 430, specs: { Type: 'SonicMaster Stereo', Compatibility: 'Vivobook X510 S510' } },
      { brand: 'LENOVO', name: 'Lenovo ThinkPad T460 T470 T480 OEM Internal Speaker Assembly 00HW878', price: 750, dealer: 550, specs: { Type: 'ThinkPad Stereo Assembly', Compatibility: 'T460 T470 T480' } },
    ]
  },

  'laptop-on-off-switch': {
    brands: ['DELL', 'HP', 'LENOVO', 'ACER', 'ASUS'],
    images: ['https://images.unsplash.com/photo-1597740985671-2a8a3b80532e?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'DELL', name: 'Dell Inspiron 15 3521 3537 5521 Power Button Board with Ribbon Cable LS-9101P', price: 380, dealer: 260, specs: { PartNo: 'LS-9101P', Inclusions: 'Board + FFC Cable' } },
      { brand: 'HP', name: 'HP 15-G 15-R 250 G3 Power Button Switch Board with Flex Cable LS-A891P', price: 350, dealer: 240, specs: { PartNo: 'LS-A891P', Inclusions: 'Board + Cable' } },
      { brand: 'LENOVO', name: 'Lenovo IdeaPad 320-15 330-15 IAP IKB Power Button Switch Board NS-B241', price: 390, dealer: 270, specs: { PartNo: 'NS-B241', Inclusions: 'Power Switch Board' } },
      { brand: 'DELL', name: 'Dell Inspiron 15 3542 3541 3543 Power Button Switch Board 05R52N with Cable', price: 370, dealer: 250, specs: { PartNo: '05R52N', Inclusions: 'Switch Board + Flex' } },
      { brand: 'HP', name: 'HP Pavilion 15-AC 15-AF 250 G4 255 G4 Power Button Board LS-C701P 813959-001', price: 360, dealer: 250, specs: { PartNo: 'LS-C701P', Inclusions: 'Switch PCB' } },
      { brand: 'ACER', name: 'Acer Aspire E5-575 E5-575G Power Button Board with Cable DA0ZAAZB6E0', price: 420, dealer: 290, specs: { PartNo: 'DA0ZAAZB6E0', Inclusions: 'OEM Switch Board' } },
      { brand: 'ASUS', name: 'Asus X555 X555L X555LD X555LN Power Button IO Board with Flat Ribbon Cable', price: 480, dealer: 340, specs: { PartNo: 'X555LD IO Board', Inclusions: 'Power + Audio + USB' } },
      { brand: 'HP', name: 'HP 15-BS 15-BW 250 G6 Power Button Switch Board 924994-001 CSL50 LS-E791P', price: 380, dealer: 260, specs: { PartNo: 'LS-E791P', Inclusions: 'Board + FFC Ribbon' } },
    ]
  },

  'laptop-dc-adapter-cable': {
    brands: ['DELL', 'HP', 'LENOVO', 'ACER', 'UNIVERSAL'],
    images: ['https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'HP', name: 'HP Blue Pin 4.5mm x 3.0mm Laptop Charger Repair DC Jack Adapter Cable with Center Pin', price: 180, dealer: 110, specs: { TipSize: '4.5mm x 3.0mm Blue Pin', Length: '1.2m Copper Cable' } },
      { brand: 'DELL', name: 'Dell 4.5mm x 3.0mm Small Pin Charger Repair DC Adapter Cable with Smart Pin', price: 190, dealer: 120, specs: { TipSize: '4.5mm Small Pin', Length: '1.2m Heavy Duty' } },
      { brand: 'LENOVO', name: 'Lenovo Square Yellow USB-Style Tip Adapter Repair DC Power Cable for ThinkPad', price: 210, dealer: 130, specs: { TipSize: 'Square USB Pin with Central Needle', Length: '1.2m' } },
      { brand: 'DELL', name: 'Dell 7.4mm x 5.0mm Big Pin Charger Repair DC Lead Power Cable with Center Pin', price: 195, dealer: 125, specs: { TipSize: '7.4mm x 5.0mm', Length: '1.2m' } },
      { brand: 'HP', name: 'HP 7.4mm x 5.0mm Yellow / Black Round Tip Laptop Adapter DC Repair Cable', price: 185, dealer: 115, specs: { TipSize: '7.4mm Round Tip', Length: '1.2m' } },
      { brand: 'ACER', name: 'Acer 5.5mm x 1.7mm Yellow Tip DC Power Cord Repair Cable for Acer Aspire Adapters', price: 170, dealer: 105, specs: { TipSize: '5.5mm x 1.7mm', Length: '1.2m' } },
      { brand: 'LENOVO', name: 'Lenovo 4.0mm x 1.7mm Small Round Pin DC Adapter Repair Cable for IdeaPad Slim', price: 180, dealer: 110, specs: { TipSize: '4.0mm x 1.7mm', Length: '1.2m' } },
      { brand: 'UNIVERSAL', name: 'USB-C Type-C 100W PD Laptop Charger Repair Replacement Heavy Braided Cable', price: 290, dealer: 190, specs: { Rating: '100W 5A Fast Charge', Connector: 'Type-C Braided' } },
    ]
  },

  'laptop-dc-jack': {
    brands: ['DELL', 'HP', 'LENOVO', 'ACER', 'ASUS'],
    images: ['https://images.unsplash.com/photo-1597740985671-2a8a3b80532e?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'DELL', name: 'Dell Inspiron 15 3511 3515 3520 3521 DC Power Jack In Cable Harness Socket 450.0KA01.0011', price: 320, dealer: 210, specs: { PinType: '4.5mm Small Pin', CableLength: '7-Wire Harness' } },
      { brand: 'HP', name: 'HP 15-DA 15-DB 15-DW 250 G7 DC Power In Jack Socket with Cable 799736-F57', price: 290, dealer: 190, specs: { PinType: '4.5mm Blue Pin', Harness: '8-Wire Connector' } },
      { brand: 'LENOVO', name: 'Lenovo IdeaPad 3 15ADA05 15ARE05 15IML05 DC-In Power Jack Connector Cable', price: 310, dealer: 200, specs: { PinType: '4.0mm x 1.7mm', Connection: 'Motherboard Harness' } },
      { brand: 'DELL', name: 'Dell Inspiron 15 5567 5568 5570 5770 DC Power Jack Harness Cable 0983C2', price: 340, dealer: 220, specs: { PartNo: '0983C2', Compatibility: 'Dell 5567 5570' } },
      { brand: 'HP', name: 'HP 15-BS 15-BW 250 G6 DC In Power Jack Port Connector with Cable 799736-Y57', price: 280, dealer: 180, specs: { PartNo: '799736-Y57', Compatibility: 'HP 250 G6 Series' } },
      { brand: 'ACER', name: 'Acer Aspire 3 A315-42 A315-54 A315-56 DC Jack Cable Connector 50.HEEN2.005', price: 330, dealer: 215, specs: { PartNo: '50.HEEN2.005', Compatibility: 'Aspire 3 A315' } },
      { brand: 'ASUS', name: 'Asus TUF Gaming FX505 FX505D FX506 FX506H DC In Power Jack Harness Cable', price: 420, dealer: 290, specs: { Rating: 'Heavy Duty Gaming 6.0mm', Compatibility: 'TUF Gaming' } },
      { brand: 'LENOVO', name: 'Lenovo ThinkPad E480 E490 E580 E590 USB-C Type-C DC Jack Charging Port Socket', price: 390, dealer: 260, specs: { Type: 'Type-C Solder Port', Pins: '24-Pin Receptacle' } },
    ]
  },

  'laptop-base-panel-touchpad': {
    brands: ['DELL', 'HP', 'LENOVO', 'ACER'],
    images: ['https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'DELL', name: 'Dell Inspiron 15 3511 3515 3520 Palmrest Upper Case with Keyboard Frame Black 0D6D9H', price: 1850, dealer: 1450, specs: { Part: 'Upper Case Palmrest', Material: 'Polycarbonate Black' } },
      { brand: 'DELL', name: 'Dell Inspiron 15 3511 3520 Bottom Base Lower Case Cover Black 092F2K', price: 1450, dealer: 1100, specs: { Part: 'Bottom Base Cover', Compatibility: 'Inspiron 3511 3520' } },
      { brand: 'HP', name: 'HP 15-DA 15-DB 250 G7 Bottom Base Lower Case Cover Jet Black L20387-001', price: 1350, dealer: 1050, specs: { Part: 'Bottom Enclosure D-Cover', Color: 'Jet Black Textured' } },
      { brand: 'HP', name: 'HP 15-DA 15-DB 250 G7 Palmrest Upper Top Cover Assembly with Touchpad L20386-001', price: 1750, dealer: 1380, specs: { Part: 'Palmrest + Touchpad', Color: 'Black' } },
      { brand: 'LENOVO', name: 'Lenovo IdeaPad 320-15 330-15 Bottom Case Lower Cover Grey 5CB0N86564', price: 1250, dealer: 950, specs: { Part: 'Bottom Base Cover D-Shell', Color: 'Platinum Grey' } },
      { brand: 'LENOVO', name: 'Lenovo IdeaPad Slim 3 15IML05 Upper Palmrest Case with Precision Touchpad Assembly', price: 1950, dealer: 1550, specs: { Part: 'Palmrest + Touchpad', Color: 'Abyss Blue' } },
      { brand: 'ACER', name: 'Acer Aspire 3 A315-42 A315-54 Bottom Base Door Cover Shell AP2ME000400', price: 1390, dealer: 1080, specs: { Part: 'Lower Base Shell', Color: 'Charcoal Black' } },
      { brand: 'DELL', name: 'Dell Inspiron 15 3567 3568 LCD Back Cover Rear Lid Top A-Cover 0XG51W', price: 1450, dealer: 1120, specs: { Part: 'Screen Back Lid A-Cover', Texture: 'Micro-diamond Pattern' } },
    ]
  },

  'laptop-display-cable': {
    brands: ['DELL', 'HP', 'LENOVO', 'ACER', 'ASUS'],
    images: ['https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'DELL', name: 'Dell Inspiron 15 3511 3515 3520 30-Pin EDP Screen LVDS Video Cable 0989TG GDL50', price: 650, dealer: 450, specs: { Pins: '30-Pin EDP', Compatibility: 'Dell 3511 3520 FHD' } },
      { brand: 'HP', name: 'HP 15-DA 15-DB 250 G7 30-Pin EDP Display Video Screen Cable DC020031800 L20423-001', price: 590, dealer: 410, specs: { Pins: '30-Pin EDP', Compatibility: 'HP 15-DA 250 G7' } },
      { brand: 'LENOVO', name: 'Lenovo IdeaPad 3 15ADA05 15ARE05 15IML05 FHD LCD Screen LVDS Cable DC02C00LQ00', price: 620, dealer: 430, specs: { Pins: '30-Pin EDP', Compatibility: 'IdeaPad 3-15 FHD' } },
      { brand: 'DELL', name: 'Dell Inspiron 15 5567 5565 30-Pin EDP Non-Touch Video Screen Cable 04G164', price: 580, dealer: 400, specs: { Pins: '30-Pin EDP', Compatibility: 'Dell 5567 5565' } },
      { brand: 'HP', name: 'HP 15-BS 15-BW 250 G6 30-Pin EDP LCD LVDS Screen Display Cable 924985-001', price: 550, dealer: 380, specs: { Pins: '30-Pin EDP', Compatibility: 'HP 250 G6 15-BS' } },
      { brand: 'ACER', name: 'Acer Aspire 3 A315-42 A315-54 A315-56 FHD Display Screen Cable 50.HEEN2.001', price: 640, dealer: 440, specs: { Pins: '30-Pin EDP', Compatibility: 'Aspire 3 A315' } },
      { brand: 'ASUS', name: 'Asus TUF Gaming FX505 FX505D FX505G 144Hz 40-Pin EDP Screen Video Cable 14005-02910000', price: 890, dealer: 650, specs: { Pins: '40-Pin EDP 144Hz', Compatibility: 'TUF Gaming FX505' } },
      { brand: 'LENOVO', name: 'Lenovo ThinkPad T470 T480 30-Pin FHD eDP Video Ribbon Cable 01AX952', price: 750, dealer: 520, specs: { Pins: '30-Pin EDP ThinkPad OEM', Compatibility: 'T470 T480' } },
    ]
  },

  'laptop-accessories': {
    brands: ['PORTRONICS', 'LOGITECH', 'ZEBRONICS', 'LENOVO', 'HP'],
    images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'LOGITECH', name: 'Logitech B100 Wired Optical USB Mouse 800 DPI Ambidextrous Design', price: 349, dealer: 260, specs: { DPI: '800 DPI Optical', Connection: 'USB Wired', Design: 'Comfortable Full Size' } },
      { brand: 'PORTRONICS', name: 'Portronics Clean G Multifunctional 8-in-1 Keyboard & Screen Cleaning Kit with Brush & Spray', price: 299, dealer: 190, specs: { Kit: '8-in-1 Gadget Cleaner', Inclusions: 'Brush, Keycap Puller, Spray' } },
      { brand: 'ZEBRONICS', name: 'Zebronics ZEB-K20 Wired USB Standard Membrane Desktop & Laptop Keyboard', price: 399, dealer: 290, specs: { Keys: '104 Keys Standard', Connection: 'USB Wired Plug & Play' } },
      { brand: 'LENOVO', name: 'Lenovo 15.6" Laptop Casual Backpack B210 Water Repellent Durable Fabric', price: 899, dealer: 690, specs: { Capacity: 'Fits up to 15.6" Laptops', Material: 'Water Repellent Polyester' } },
      { brand: 'HP', name: 'HP 150 Wireless Optical Mouse with 2.4GHz USB Nano Receiver & 1600 DPI', price: 649, dealer: 480, specs: { Connectivity: '2.4GHz Wireless', Battery: 'Up to 12 Months AA' } },
      { brand: 'PORTRONICS', name: 'Portronics Clamp X Adjustable Foldable Laptop Stand Aluminum Alloy with Silicon Pads', price: 799, dealer: 580, specs: { Material: 'Sandblasted Aluminium', Levels: '6 Height Adjustments' } },
      { brand: 'LOGITECH', name: 'Logitech M221 Silent Wireless Optical Mouse 90% Noise Reduction', price: 899, dealer: 680, specs: { Noise: '90% Silent Clicks', BatteryLife: '18 Months AA' } },
      { brand: 'ZEBRONICS', name: 'Zebronics Zeb-Comfort+ Wired USB Optical Mouse with 1000 DPI Sensor', price: 199, dealer: 140, specs: { DPI: '1000 DPI Optical', CableLength: '1.2m Durable Cable' } },
    ]
  },

  // Desktops & All-in-One PCs
  'touchscreen-aio': {
    brands: ['HP', 'DELL', 'LENOVO', 'ASUS'],
    images: ['https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'HP', name: 'HP Envy 34 All-in-One Desktop Core i7 12700 (16GB | 1TB SSD | 34" 5K WUHD Touch | GTX 1650)', price: 169990, dealer: 154000, specs: { Screen: '34" 5K Touchscreen', Processor: 'Core i7 12700', RAM: '16GB DDR5' } },
      { brand: 'DELL', name: 'Dell Inspiron 27 7720 All-in-One Core i7 1355U (16GB | 1TB SSD | 27" FHD Touch | Iris Xe)', price: 94990, dealer: 86500, specs: { Screen: '27" FHD IPS Touch', Processor: 'Core i7 13th Gen', RAM: '16GB DDR4' } },
      { brand: 'HP', name: 'HP Pavilion 24 All-in-One Core i5 1335U (16GB | 512GB SSD | 23.8" FHD IPS Touchscreen | Win 11)', price: 74990, dealer: 68000, specs: { Screen: '23.8" FHD IPS Touch', Processor: 'Core i5 1335U', RAM: '16GB' } },
      { brand: 'LENOVO', name: 'Lenovo IdeaCentre AIO 5 24" Core i5 12500H (16GB | 512GB SSD | 23.8" Touch | JBL Speakers)', price: 79990, dealer: 72500, specs: { Screen: '23.8" Touchscreen', Audio: 'JBL 3W + 5W Woofer', RAM: '16GB' } },
      { brand: 'ASUS', name: 'Asus Zen AiO 24 M5401 AMD Ryzen 7 5700U (16GB | 512GB SSD | 23.8" Touch NanoEdge)', price: 71990, dealer: 65000, specs: { Screen: '23.8" NanoEdge Touch', Processor: 'Ryzen 7 5700U', RAM: '16GB' } },
      { brand: 'HP', name: 'HP 24-cr0008in All-in-One AMD Ryzen 5 7520U (16GB | 512GB SSD | 23.8" Touchscreen)', price: 61990, dealer: 56000, specs: { Screen: '23.8" FHD Touch', Processor: 'Ryzen 5 7520U', RAM: '16GB' } },
      { brand: 'DELL', name: 'Dell Inspiron 24 5420 Core i5 1335U (8GB | 512GB SSD | 23.8" FHD Anti-Glare Touchscreen)', price: 68990, dealer: 62500, specs: { Screen: '23.8" FHD Touch', Processor: 'Core i5 13th', RAM: '8GB DDR4' } },
      { brand: 'LENOVO', name: 'Lenovo Yoga AIO 7 27" 4K Rotatable Touch Desktop (AMD Ryzen 7 6800H | 32GB | 1TB SSD | RX 6600M)', price: 149990, dealer: 136000, specs: { Screen: '27" 4K UHD Touch 90 Rotatable', Processor: 'Ryzen 7', RAM: '32GB' } },
    ]
  },

  'non-touch-aio': {
    brands: ['HP', 'DELL', 'LENOVO', 'ASUS', 'ACER'],
    images: ['https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'HP', name: 'HP 24-df1071in All-in-One Core i3 1125G4 (8GB DDR4 | 512GB SSD | 23.8" FHD IPS Non-Touch | Win 11)', price: 44990, dealer: 40500, specs: { Screen: '23.8" FHD IPS Anti-Glare', Processor: 'Core i3 11th Gen', RAM: '8GB' } },
      { brand: 'LENOVO', name: 'Lenovo IdeaCentre AIO 3 24IAP7 Core i3 1215U (8GB | 512GB SSD | 23.8" FHD IPS | White)', price: 43990, dealer: 39500, specs: { Screen: '23.8" FHD IPS', Processor: 'Core i3 1215U', RAM: '8GB' } },
      { brand: 'DELL', name: 'Dell Inspiron 24 5410 Core i5 1235U (8GB | 512GB SSD | 23.8" FHD IPS | Wireless Keyboard Mouse)', price: 59990, dealer: 54500, specs: { Screen: '23.8" FHD IPS', Processor: 'Core i5 1235U', RAM: '8GB DDR4' } },
      { brand: 'HP', name: 'HP 27-cb1006in All-in-One Core i5 1235U (16GB | 512GB SSD | 27" FHD Anti-Glare | Starry White)', price: 69990, dealer: 63500, specs: { Screen: '27" FHD IPS Non-Touch', Processor: 'Core i5 12th Gen', RAM: '16GB' } },
      { brand: 'ASUS', name: 'Asus ExpertCenter E5 AIO 24 Core i5 11500B (8GB | 512GB SSD | 23.8" FHD Anti-Glare Enterprise)', price: 54990, dealer: 49800, specs: { Screen: '23.8" Non-Touch', Processor: 'Core i5 11500B', RAM: '8GB' } },
      { brand: 'ACER', name: 'Acer Aspire C24 All-in-One Core i3 1215U (8GB | 512GB SSD | 23.8" Borderless FHD IPS)', price: 41990, dealer: 37800, specs: { Screen: '23.8" Borderless FHD', Processor: 'Core i3 1215U', RAM: '8GB' } },
      { brand: 'LENOVO', name: 'Lenovo IdeaCentre AIO 3 27IAP7 Core i7 1260P (16GB | 512GB SSD | 27" FHD IPS Narrow Bezel)', price: 79990, dealer: 72500, specs: { Screen: '27" FHD IPS', Processor: 'Core i7 1260P', RAM: '16GB' } },
      { brand: 'HP', name: 'HP ProOne 440 G9 All-in-One Core i5 13500 (16GB | 512GB SSD | 23.8" FHD Business Security)', price: 64990, dealer: 59000, specs: { Screen: '23.8" FHD IPS', Processor: 'Core i5 13500', RAM: '16GB DDR4' } },
    ]
  },

  'intel-gaming-pcs': {
    brands: ['ASUS', 'MSI', 'LENOVO', 'HP'],
    images: ['https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'MSI', name: 'MSI MAG Infinite S3 Gaming Desktop (Core i7 14700F | 16GB DDR5 | RTX 4070 12GB | 1TB SSD)', price: 129990, dealer: 118000, specs: { Processor: 'Core i7 14700F', GPU: 'RTX 4070 12GB', RAM: '16GB DDR5' } },
      { brand: 'ASUS', name: 'Asus ROG Strix G13CHR Gaming PC (Core i7 14700KF | 32GB DDR5 | RTX 4070 Super 12GB | 1TB SSD)', price: 159990, dealer: 145000, specs: { Processor: 'Core i7 14700KF', GPU: 'RTX 4070 Super 12GB', RAM: '32GB DDR5' } },
      { brand: 'LENOVO', name: 'Lenovo Legion Tower 5i (Core i5 13400F | 16GB DDR5 | RTX 4060 8GB | 512GB SSD | ARGB Fans)', price: 89990, dealer: 81500, specs: { Processor: 'Core i5 13400F', GPU: 'RTX 4060 8GB', RAM: '16GB DDR5' } },
      { brand: 'HP', name: 'HP Omen 40L Gaming Desktop (Core i7 13700K | 32GB HyperX DDR5 | RTX 4070 Ti 12GB | Liquid Cooled)', price: 179990, dealer: 163000, specs: { Processor: 'Core i7 13700K', GPU: 'RTX 4070 Ti 12GB', Cooling: 'Liquid Cooler' } },
      { brand: 'ASUS', name: 'Asus ROG Strix GT15 (Core i5 12400F | 16GB DDR4 | RTX 3060 12GB | 512GB SSD + 1TB HDD)', price: 74990, dealer: 68000, specs: { Processor: 'Core i5 12400F', GPU: 'RTX 3060 12GB', RAM: '16GB' } },
      { brand: 'MSI', name: 'MSI MPG Infinite X2 14th (Core i9 14900KF | 64GB DDR5 | RTX 4090 24GB | 2TB Gen4 SSD)', price: 349990, dealer: 318000, specs: { Processor: 'Core i9 14900KF', GPU: 'RTX 4090 24GB', RAM: '64GB DDR5' } },
      { brand: 'LENOVO', name: 'Lenovo LOQ Tower (Core i5 13400F | 16GB DDR5 | RTX 3050 8GB | 512GB SSD | 500W PSU)', price: 68990, dealer: 62500, specs: { Processor: 'Core i5 13400F', GPU: 'RTX 3050 8GB', RAM: '16GB' } },
      { brand: 'HP', name: 'HP Victus 15L Gaming Desktop (Core i5 13400 | 16GB RAM | RTX 3060 12GB | 512GB SSD | Mica Silver)', price: 76990, dealer: 69900, specs: { Processor: 'Core i5 13400', GPU: 'RTX 3060 12GB', RAM: '16GB DDR4' } },
    ]
  },

  'amd-gaming-pcs': {
    brands: ['HP', 'ASUS', 'LENOVO', 'MSI'],
    images: ['https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'HP', name: 'HP OMEN 25L Gaming Desktop (AMD Ryzen 7 5700G | 16GB HyperX | RTX 4060 8GB | 1TB SSD)', price: 99990, dealer: 91000, specs: { Processor: 'AMD Ryzen 7 5700G', GPU: 'GeForce RTX 4060', RAM: '16GB' } },
      { brand: 'ASUS', name: 'Asus ROG Strix G10DK (AMD Ryzen 7 5800X | 16GB DDR4 | RTX 3060 Ti 8GB | 1TB SSD)', price: 89990, dealer: 81500, specs: { Processor: 'AMD Ryzen 7 5800X', GPU: 'RTX 3060 Ti 8GB', RAM: '16GB' } },
      { brand: 'LENOVO', name: 'Lenovo Legion Tower 5 Gen 8 (AMD Ryzen 7 7700 | 32GB DDR5 | RTX 4070 12GB | 1TB SSD)', price: 139990, dealer: 127000, specs: { Processor: 'AMD Ryzen 7 7700', GPU: 'RTX 4070 12GB', RAM: '32GB DDR5' } },
      { brand: 'HP', name: 'HP Victus 15L AMD Gaming Desktop (Ryzen 5 5600G | 16GB DDR4 | Radeon RX 6400 4GB | 512GB SSD)', price: 54990, dealer: 49500, specs: { Processor: 'Ryzen 5 5600G', GPU: 'Radeon RX 6400', RAM: '16GB' } },
      { brand: 'ASUS', name: 'Asus ROG Hyperion AMD Elite Custom Build (Ryzen 7 7800X3D | 32GB DDR5 | RTX 4080 Super 16GB)', price: 229990, dealer: 208000, specs: { Processor: 'Ryzen 7 7800X3D', GPU: 'RTX 4080 Super', RAM: '32GB DDR5' } },
      { brand: 'MSI', name: 'MSI MAG Meta 5 (AMD Ryzen 5 7600X | 16GB DDR5 | RTX 4060 Ti 8GB | 1TB NVMe SSD)', price: 104990, dealer: 95000, specs: { Processor: 'Ryzen 5 7600X', GPU: 'RTX 4060 Ti 8GB', RAM: '16GB DDR5' } },
      { brand: 'LENOVO', name: 'Lenovo IdeaCentre Gaming 5 (AMD Ryzen 5 5600G | 16GB RAM | RTX 3060 12GB | Raven Black)', price: 71990, dealer: 65000, specs: { Processor: 'Ryzen 5 5600G', GPU: 'RTX 3060 12GB', RAM: '16GB' } },
      { brand: 'HP', name: 'HP Omen 45L Liquid Cooled Desktop (AMD Ryzen 9 7900X | 64GB DDR5 | RTX 4090 24GB | Cryo Chamber)', price: 379990, dealer: 345000, specs: { Processor: 'Ryzen 9 7900X', GPU: 'RTX 4090 24GB', Cooling: 'Patented Cryo Chamber' } },
    ]
  },

  'cad-rendering-workstations': {
    brands: ['DELL', 'HP', 'LENOVO'],
    images: ['https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'DELL', name: 'Dell Precision 3660 Tower Workstation (Intel Core i7 13700 | 32GB DDR5 | NVIDIA RTX A2000 12GB)', price: 145000, dealer: 132000, specs: { GPU: 'NVIDIA RTX A2000 12GB', RAM: '32GB DDR5 ECC', OS: 'Windows 11 Pro' } },
      { brand: 'HP', name: 'HP Z2 Tower G9 Workstation (Intel Core i7 13700K | 32GB DDR5 | NVIDIA RTX A4000 16GB | 1TB NVMe)', price: 189000, dealer: 172000, specs: { GPU: 'NVIDIA RTX A4000 16GB', RAM: '32GB DDR5', Power: '700W 92% Efficiency' } },
      { brand: 'LENOVO', name: 'Lenovo ThinkStation P3 Tower Workstation (Core i7 13700 | 32GB ECC | NVIDIA T1000 8GB | 1TB SSD)', price: 129000, dealer: 117000, specs: { GPU: 'NVIDIA T1000 8GB', RAM: '32GB DDR5 ECC', Cert: 'ISV Certified' } },
      { brand: 'DELL', name: 'Dell Precision 5860 Tower Workstation (Intel Xeon W-2445 | 64GB DDR5 ECC | NVIDIA RTX A4500 20GB)', price: 285000, dealer: 259000, specs: { Processor: 'Intel Xeon W-2445', GPU: 'RTX A4500 20GB', RAM: '64GB ECC DDR5' } },
      { brand: 'HP', name: 'HP Z4 G5 Workstation (Intel Xeon W3-2423 | 64GB DDR5 | NVIDIA RTX A5000 24GB | 2TB Z Turbo SSD)', price: 345000, dealer: 314000, specs: { Processor: 'Intel Xeon W3-2423', GPU: 'RTX A5000 24GB', RAM: '64GB ECC' } },
      { brand: 'LENOVO', name: 'Lenovo ThinkStation P620 (AMD Ryzen Threadripper PRO 5955WX | 64GB DDR4 ECC | RTX A4000 16GB)', price: 299000, dealer: 272000, specs: { Processor: 'Threadripper PRO 16C', GPU: 'RTX A4000 16GB', RAM: '64GB' } },
      { brand: 'DELL', name: 'Dell Precision 3460 Small Form Factor (Core i5 13500 | 16GB DDR5 | NVIDIA T400 4GB | Compact SFF)', price: 89000, dealer: 81000, specs: { FormFactor: 'Small Form Factor (SFF)', GPU: 'NVIDIA T400 4GB', RAM: '16GB' } },
      { brand: 'HP', name: 'HP ZCentral 4R 1U Rack Workstation (Intel Xeon W-2223 | 32GB ECC | NVIDIA Quadro P2200 5GB)', price: 175000, dealer: 159000, specs: { FormFactor: '1U Rackmount', GPU: 'Quadro P2200 5GB', RAM: '32GB' } },
    ]
  },

  // Storage
  'internal-ssd-nvme': {
    brands: ['WESTERN DIGITAL', 'CRUCIAL', 'SAMSUNG', 'KINGSTON'],
    images: ['https://images.unsplash.com/photo-1597740985671-2a8a3b80532e?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'WESTERN DIGITAL', name: 'WD Blue SN580 500GB NVMe PCIe Gen4 M.2 SSD up to 4000 MB/s WDS500G3B0E', price: 3450, dealer: 2950, specs: { Capacity: '500GB', Interface: 'PCIe Gen4 x4 NVMe', ReadSpeed: '4000 MB/s' } },
      { brand: 'WESTERN DIGITAL', name: 'WD Blue SN580 1TB NVMe PCIe Gen4 M.2 SSD up to 4150 MB/s WDS100T3B0E', price: 5650, dealer: 4850, specs: { Capacity: '1TB', Interface: 'PCIe Gen4 x4 NVMe', ReadSpeed: '4150 MB/s' } },
      { brand: 'WESTERN DIGITAL', name: 'WD Black SN770 1TB NVMe PCIe Gen4 Gaming SSD up to 5150 MB/s WDS100T3X0E', price: 6750, dealer: 5800, specs: { Capacity: '1TB', ReadSpeed: '5150 MB/s', Category: 'Gaming High Speed' } },
      { brand: 'CRUCIAL', name: 'Crucial P3 Plus 1TB PCIe 4.0 3D NAND NVMe M.2 SSD up to 5000 MB/s CT1000P3PSSD8', price: 5490, dealer: 4700, specs: { Capacity: '1TB', Interface: 'PCIe Gen4 M.2', ReadSpeed: '5000 MB/s' } },
      { brand: 'CRUCIAL', name: 'Crucial BX500 500GB 2.5-inch SATA III Internal Solid State Drive CT500BX500SSD1', price: 2890, dealer: 2450, specs: { Capacity: '500GB', Interface: 'SATA III 6Gb/s', ReadSpeed: '540 MB/s' } },
      { brand: 'SAMSUNG', name: 'Samsung 980 1TB PCIe 3.0 NVMe M.2 Internal SSD up to 3500 MB/s MZ-V8V1T0BW', price: 6990, dealer: 6000, specs: { Capacity: '1TB', Interface: 'PCIe 3.0 NVMe', ReadSpeed: '3500 MB/s' } },
      { brand: 'SAMSUNG', name: 'Samsung 990 PRO 1TB PCIe 4.0 NVMe M.2 Gaming SSD up to 7450 MB/s MZ-V9P1T0BW', price: 9890, dealer: 8500, specs: { Capacity: '1TB', Interface: 'PCIe 4.0 NVMe', ReadSpeed: '7450 MB/s' } },
      { brand: 'KINGSTON', name: 'Kingston NV2 1TB M.2 2280 NVMe Internal SSD up to 3500 MB/s SNV2S/1000G', price: 4990, dealer: 4300, specs: { Capacity: '1TB', Interface: 'PCIe 4.0 NVMe', ReadSpeed: '3500 MB/s' } },
    ]
  },

  'external-hard-drives': {
    brands: ['WESTERN DIGITAL', 'SEAGATE'],
    images: ['https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'WESTERN DIGITAL', name: 'WD Elements 1.5TB Portable External Hard Drive USB 3.0 Black WDBU6Y0015BBK', price: 4799, dealer: 4150, specs: { Capacity: '1.5TB', Interface: 'USB 3.0 Plug & Play', Form: '2.5 Inch Portable' } },
      { brand: 'WESTERN DIGITAL', name: 'WD My Passport 2TB Portable External Hard Drive with Password Protection WDBYFT0020BBK', price: 5899, dealer: 5100, specs: { Capacity: '2TB', Security: '256-bit AES Hardware Encryption' } },
      { brand: 'WESTERN DIGITAL', name: 'WD Elements 4TB Portable External Hard Drive USB 3.0 WDBU6Y0040BBK', price: 8999, dealer: 7800, specs: { Capacity: '4TB', Interface: 'USB 3.0', Form: 'Portable 2.5"' } },
      { brand: 'SEAGATE', name: 'Seagate Expansion 1TB External HDD USB 3.0 with Rescue Data Recovery Services', price: 4299, dealer: 3700, specs: { Capacity: '1TB', Warranty: '3 Years with Rescue Services' } },
      { brand: 'SEAGATE', name: 'Seagate One Touch 2TB External Hard Drive with Password Protection Space Grey', price: 6199, dealer: 5350, specs: { Capacity: '2TB', Finish: 'Brushed Metal Enclosure' } },
      { brand: 'SEAGATE', name: 'Seagate Backup Plus Hub 8TB Desktop External Hard Drive with Dual Front USB Ports', price: 16999, dealer: 14800, specs: { Capacity: '8TB Desktop', Features: 'Dual Front USB 3.0 Hub Ports' } },
      { brand: 'WESTERN DIGITAL', name: 'WD Black P10 Game Drive 2TB External Portable Hard Drive for PC & Consoles', price: 6499, dealer: 5600, specs: { Capacity: '2TB', Build: 'Durable Metal Top Cover' } },
      { brand: 'SEAGATE', name: 'Seagate Expansion 5TB Portable External Hard Drive USB 3.0 Black STKM5000400', price: 10499, dealer: 9100, specs: { Capacity: '5TB', Interface: 'SuperSpeed USB 3.0' } },
    ]
  },

  'surveillance-storage': {
    brands: ['WESTERN DIGITAL', 'SEAGATE'],
    images: ['https://images.unsplash.com/photo-1597740985671-2a8a3b80532e?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'WESTERN DIGITAL', name: 'WD Purple 1TB Surveillance Internal Hard Drive 3.5" SATA 64MB Cache WD10PURZ', price: 3650, dealer: 3150, specs: { Capacity: '1TB', Workload: 'Surveillance 24/7 AllFrame 4K' } },
      { brand: 'WESTERN DIGITAL', name: 'WD Purple 2TB Surveillance Internal Hard Drive 3.5" SATA 64MB Cache WD22PURZ', price: 4850, dealer: 4200, specs: { Capacity: '2TB', Workload: 'Up to 64 HD Cameras Supported' } },
      { brand: 'WESTERN DIGITAL', name: 'WD Purple 4TB Surveillance Internal Hard Drive 3.5" SATA 256MB Cache WD42PURZ', price: 7850, dealer: 6850, specs: { Capacity: '4TB', Cache: '256MB AllFrame AI Support' } },
      { brand: 'WESTERN DIGITAL', name: 'WD Purple Pro 8TB Enterprise Surveillance Hard Drive 7200 RPM WD8001PURP', price: 17500, dealer: 15300, specs: { Capacity: '8TB', RPM: '7200 RPM Enterprise' } },
      { brand: 'SEAGATE', name: 'Seagate SkyHawk 1TB Surveillance Hard Drive 3.5" SATA 64MB Cache ST1000VX005', price: 3550, dealer: 3050, specs: { Capacity: '1TB', Firmware: 'ImagePerfect Surveillance' } },
      { brand: 'SEAGATE', name: 'Seagate SkyHawk 2TB Surveillance Hard Drive 3.5" SATA 64MB Cache ST2000VX015', price: 4750, dealer: 4100, specs: { Capacity: '2TB', Support: 'Up to 64 Streaming HD Cameras' } },
      { brand: 'SEAGATE', name: 'Seagate SkyHawk 4TB Surveillance Hard Drive 3.5" SATA 256MB Cache ST4000VX016', price: 7650, dealer: 6650, specs: { Capacity: '4TB', Sensors: 'Rotational Vibration (RV) Sensors' } },
      { brand: 'SEAGATE', name: 'Seagate SkyHawk AI 8TB Surveillance HDD with SkyHawk Health Management', price: 16900, dealer: 14800, specs: { Capacity: '8TB', Workload: '550TB/year Extreme AI Workloads' } },
    ]
  },

  // Displays
  'led-ips-monitors': {
    brands: ['DELL', 'LG', 'SAMSUNG', 'ACER', 'HP'],
    images: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'DELL', name: 'Dell 24-inch SE2422HX Full HD Monitor (1920x1080 | 75Hz | VA Panel | HDMI & VGA)', price: 7999, dealer: 7100, specs: { Screen: '23.8" FHD 75Hz', Ports: 'HDMI & VGA', Bezel: 'Three-sided Slim Bezel' } },
      { brand: 'LG', name: 'LG 24MP400-B 24-inch Full HD IPS Monitor (1920x1080 | 75Hz | AMD FreeSync | 3-Side Borderless)', price: 8299, dealer: 7350, specs: { Screen: '23.8" FHD IPS', Technology: 'AMD FreeSync 75Hz' } },
      { brand: 'SAMSUNG', name: 'Samsung 24-inch LF24T350FHWXXL IPS Borderless Flat Monitor (75Hz | AMD FreeSync | HDMI)', price: 8199, dealer: 7250, specs: { Screen: '24" FHD IPS 75Hz', Design: '3-Sided Borderless' } },
      { brand: 'DELL', name: 'Dell 27-inch S2721HN Full HD IPS Monitor (75Hz | AMD FreeSync | Dual HDMI Ports | VESA)', price: 11999, dealer: 10600, specs: { Screen: '27" FHD IPS 75Hz', Ports: 'Dual HDMI 1.4' } },
      { brand: 'HP', name: 'HP M24f 23.8-inch Ultra-Slim Full HD IPS Monitor (75Hz | 99% sRGB | Eyesafe Certified)', price: 8999, dealer: 7950, specs: { Screen: '23.8" FHD IPS', Profile: 'Ultra-slim Profile' } },
      { brand: 'ACER', name: 'Acer EK220Q 21.5-inch Full HD Monitor (1920x1080 | 100Hz Refresh Rate | VA Panel | HDMI)', price: 5499, dealer: 4850, specs: { Screen: '21.5" FHD 100Hz', Ports: 'HDMI + VGA' } },
      { brand: 'LG', name: 'LG 27MP400 27-inch Full HD IPS Borderless Monitor (75Hz | Reader Mode | Flicker Safe)', price: 11499, dealer: 10200, specs: { Screen: '27" FHD IPS', Features: 'Reader Mode & Flicker Safe' } },
      { brand: 'ACER', name: 'Acer SA242Y 23.8-inch Ultra-Thin 100Hz IPS Full HD Monitor with Built-in Speakers', price: 7699, dealer: 6800, specs: { Screen: '23.8" FHD IPS 100Hz', Audio: 'Integrated Dual Speakers' } },
    ]
  },

  'high-refresh-gaming-monitors': {
    brands: ['LG', 'ACER', 'SAMSUNG', 'ASUS', 'MSI'],
    images: ['https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'LG', name: 'LG UltraGear 24GN65R 24-inch 144Hz FHD IPS Gaming Monitor (1ms MBR | FreeSync Premium | HDR10)', price: 11499, dealer: 10200, specs: { Screen: '24" FHD IPS 144Hz', ResponseTime: '1ms MBR', Stand: 'Height & Tilt Adjustable' } },
      { brand: 'ACER', name: 'Acer Nitro VG240YS 23.8-inch 165Hz FHD IPS Gaming Monitor (0.5ms Response | AMD FreeSync)', price: 10299, dealer: 9100, specs: { Screen: '23.8" FHD 165Hz IPS', ResponseTime: '0.5ms', Sync: 'AMD FreeSync Premium' } },
      { brand: 'SAMSUNG', name: 'Samsung Odyssey G3 24-inch 165Hz Gaming Monitor (1ms MPRT | Height Swivel Pivot Stand)', price: 10999, dealer: 9800, specs: { Screen: '24" FHD 165Hz', Stand: 'Has Height, Pivot & Tilt' } },
      { brand: 'ASUS', name: 'Asus TUF Gaming VG249Q1A 23.8-inch 165Hz IPS Gaming Monitor (1ms MPRT | Extreme Low Motion Blur)', price: 12499, dealer: 11100, specs: { Screen: '23.8" FHD IPS 165Hz', Tech: 'ASUS ELMB Technology' } },
      { brand: 'MSI', name: 'MSI G2412 24-inch 170Hz FHD IPS Esports Gaming Monitor (1ms Response | Wide Color Gamut)', price: 10899, dealer: 9650, specs: { Screen: '24" FHD IPS 170Hz', ColorGamut: '85% DCI-P3' } },
      { brand: 'LG', name: 'LG UltraGear 27GR75Q 27-inch QHD 2K 165Hz IPS Gaming Monitor (2560x1440 | 1ms | G-Sync Compatible)', price: 21999, dealer: 19500, specs: { Screen: '27" 2K QHD IPS 165Hz', Resolution: '2560 x 1440', GSync: 'NVIDIA G-Sync Compatible' } },
      { brand: 'ACER', name: 'Acer Predator XB253Q 24.5-inch 240Hz FHD IPS Esports Monitor (0.5ms | DisplayHDR 400)', price: 17999, dealer: 15900, specs: { Screen: '24.5" FHD IPS 240Hz', Certification: 'VESA DisplayHDR 400' } },
      { brand: 'SAMSUNG', name: 'Samsung Odyssey G5 27-inch 165Hz 1000R Curved QHD 2K Gaming Monitor LC27G55TQWWXXL', price: 18999, dealer: 16800, specs: { Screen: '27" QHD 1000R Curved 165Hz', Curvature: '1000R Optimal Curve' } },
    ]
  },

  // Peripherals
  'keyboards-mice-combos': {
    brands: ['LOGITECH', 'DELL', 'HP', 'ZEBRONICS'],
    images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'LOGITECH', name: 'Logitech MK240 Nano Wireless Keyboard and Mouse Combo Splash-Proof Compact Design', price: 1499, dealer: 1180, specs: { Wireless: '2.4GHz USB Receiver', BatteryLife: '36 Months Keyboard / 12 Mouse' } },
      { brand: 'LOGITECH', name: 'Logitech MK215 Wireless Keyboard and Mouse Combo Compact Full-Layout Black', price: 1299, dealer: 1040, specs: { Wireless: '2.4GHz 10m Range', Encryption: '128-bit AES Encryption' } },
      { brand: 'DELL', name: 'Dell KM3322W Wireless Keyboard and Mouse Combo Anti-Fade Keys Long Battery Life', price: 1399, dealer: 1120, specs: { BatteryLife: '36 Months Keyboard / 18 Mouse', Keys: 'Spill Resistant' } },
      { brand: 'DELL', name: 'Dell KM117 Wireless Keyboard and Mouse Sleek Design with Nano Dongle', price: 1349, dealer: 1080, specs: { Layout: 'Full Size with Numeric Keypad', Mouse: '1000 DPI Optical' } },
      { brand: 'HP', name: 'HP 150 Wireless Keyboard and Mouse Combo with 12 Shortcut Function Keys', price: 1199, dealer: 940, specs: { Features: '12 Fn Multimedia Keys', Connectivity: '2.4GHz Wireless USB' } },
      { brand: 'ZEBRONICS', name: 'Zebronics Companion 107 Wireless Keyboard & Mouse Combo with Rupee Key & Nano Receiver', price: 699, dealer: 520, specs: { Layout: 'Full Sized Standard', MouseDPI: '1200 DPI High Precision' } },
      { brand: 'LOGITECH', name: 'Logitech MK270r Wireless Keyboard and Mouse Combo 8 Multimedia Shortcut Keys', price: 1649, dealer: 1320, specs: { Hotkeys: '8 Instant Access Shortcuts', Range: 'Up to 10m' } },
      { brand: 'DELL', name: 'Dell Pro Wireless Keyboard and Mouse KM5221W Programmable Keys 4000 DPI Mouse', price: 2399, dealer: 1950, specs: { MouseSensor: 'Adjustable up to 4000 DPI', Battery: 'Up to 36 Months' } },
    ]
  },

  'webcams-headsets': {
    brands: ['LOGITECH', 'ZEBRONICS', 'PORTRONICS', 'HP'],
    images: ['https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'LOGITECH', name: 'Logitech C270 HD 720p Webcam with Built-in Noise-Reducing Mic and Light Correction', price: 2199, dealer: 1780, specs: { Video: 'HD 720p / 30fps', Mic: 'Built-in Mono Noise-Reducing' } },
      { brand: 'LOGITECH', name: 'Logitech C920 HD Pro Webcam Full HD 1080p Video Calling with Dual Stereo Mics', price: 7499, dealer: 6200, specs: { Video: 'Full HD 1080p / 30fps', Audio: 'Dual Stereo Microphones' } },
      { brand: 'LOGITECH', name: 'Logitech H111 Stereo Headset with Multi-Device 3.5mm Audio Jack and Noise-Cancelling Mic', price: 849, dealer: 650, specs: { Connector: '3.5mm Audio Jack', Boom: 'Rotating 180 Microphone' } },
      { brand: 'LOGITECH', name: 'Logitech H390 USB Computer Headset with Enhanced Digital Audio and In-Line Controls', price: 2899, dealer: 2350, specs: { Connector: 'USB-A Plug and Play', Controls: 'In-line Volume and Mute' } },
      { brand: 'ZEBRONICS', name: 'Zebronics Zeb-Crisp Pro Full HD 1080p Web Camera with Built-in Mic & Privacy Shutter', price: 1299, dealer: 950, specs: { Resolution: '1920x1080 FHD', Lens: 'Wide Angle Glass Lens' } },
      { brand: 'ZEBRONICS', name: 'Zebronics Zeb-Iron Head Wired On-Ear Headphone with Mic for Office Calls', price: 499, dealer: 350, specs: { Cushion: 'Soft Ear Cushions', Cable: 'Tangle-Free Cable with Mic' } },
      { brand: 'PORTRONICS', name: 'Portronics Talk Two 360-Degree Conference Speakerphone with Omnidirectional Microphone', price: 3499, dealer: 2750, specs: { MicPickup: '360 Omnidirectional up to 4m', Connection: 'USB-C Plug & Play' } },
      { brand: 'HP', name: 'HP w300 Full HD 1080p Web Camera with Wide 70-Degree Field of View & Tripod Mount', price: 1899, dealer: 1480, specs: { Resolution: '1080p 30fps', Mount: 'Universal Clip & Tripod Hole' } },
    ]
  },

  // Printers
  'laser-printers': {
    brands: ['HP', 'CANON', 'BROTHER'],
    images: ['https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'HP', name: 'HP Laser 1008w Single Function Monochrome Wireless Laser Printer (Wi-Fi, USB 2.0)', price: 12990, dealer: 11400, specs: { Type: 'Monochrome Laser', Speed: 'Up to 20 ppm', Connectivity: 'Wi-Fi & Hi-Speed USB' } },
      { brand: 'HP', name: 'HP LaserJet Pro MFP M126nw Multi-Function Monochrome Laser Printer (Print, Scan, Copy, Wi-Fi)', price: 18990, dealer: 16800, specs: { Functions: 'Print, Copy, Scan', Connectivity: 'Ethernet & Wi-Fi' } },
      { brand: 'CANON', name: 'Canon imageCLASS LBP2900B Single Function Monochrome Laser Printer Classic Workhorse', price: 14490, dealer: 12800, specs: { Cartridge: 'Canon 303 Toner', Speed: '12 ppm A4', Technology: 'CAPT 2.1' } },
      { brand: 'CANON', name: 'Canon imageCLASS MF3010 Multi-Function Monochrome Laser Printer (Print, Scan, Copy)', price: 16490, dealer: 14600, specs: { Functions: 'Print, Scan, Copy', Speed: '18 ppm', FirstPageOut: '7.8 sec' } },
      { brand: 'BROTHER', name: 'Brother HL-L2321D Single Function Monochrome Laser Printer with Automatic Duplex Printing', price: 10490, dealer: 9200, specs: { Duplex: 'Automatic 2-Sided Printing', Speed: 'Up to 30 ppm' } },
      { brand: 'BROTHER', name: 'Brother DCP-L2520D Multi-Function Monochrome Laser Printer (Auto 2-Sided Print, Scan, Copy)', price: 16990, dealer: 15100, specs: { Duplex: 'Auto Duplex Printing', Speed: '30 ppm High Speed' } },
      { brand: 'HP', name: 'HP LaserJet MFP M141w Compact Multi-Function Wireless Monochrome Laser Printer', price: 16290, dealer: 14400, specs: { Dimensions: 'Ultra Compact Size', Connectivity: 'HP Smart App & Wi-Fi' } },
      { brand: 'CANON', name: 'Canon imageCLASS LBP6030W Compact Single Function Wireless Monochrome Laser Printer', price: 11990, dealer: 10500, specs: { Power: 'On-Demand Fixing System', Wireless: 'Wi-Fi 802.11 b/g/n' } },
    ]
  },

  'ink-tank-printers': {
    brands: ['EPSON', 'CANON', 'HP', 'BROTHER'],
    images: ['https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'EPSON', name: 'Epson EcoTank L3210 All-in-One Ink Tank Colour Printer (Print, Scan, Copy | Spill-Free Refill)', price: 12490, dealer: 10900, specs: { Type: 'Color All-in-One Ink Tank', PageYield: '4500 Black / 7500 Color Pages' } },
      { brand: 'EPSON', name: 'Epson EcoTank L3250 Wi-Fi All-in-One Colour Ink Tank Printer (Smart App, Print, Scan, Copy)', price: 14990, dealer: 13200, specs: { Connectivity: 'Wi-Fi & Wi-Fi Direct', MobileApp: 'Epson Smart Panel' } },
      { brand: 'CANON', name: 'Canon PIXMA G2012 All-in-One Colour Ink Tank Printer (Print, Scan, Copy | High Page Yield)', price: 11490, dealer: 10100, specs: { Functions: 'Print, Scan, Copy', Yield: '6000 Black / 7000 Color Pages' } },
      { brand: 'CANON', name: 'Canon PIXMA G3010 All-in-One Wireless Colour Ink Tank Printer (Wi-Fi, Direct Mobile Printing)', price: 13990, dealer: 12300, specs: { Wireless: 'Direct Mobile & Cloud Printing', PrintResolution: '4800 x 1200 dpi' } },
      { brand: 'HP', name: 'HP Smart Tank 580 All-in-One Wireless Colour Ink Tank Printer with Up to 2 Years of Ink', price: 13490, dealer: 11800, specs: { InTheBox: 'Up to 12000 Black / 6000 Color Pages', 'Wi-Fi': 'Self-Healing Wi-Fi' } },
      { brand: 'HP', name: 'HP Smart Tank 520 All-in-One Colour Ink Tank Printer (Print, Scan, Copy | USB 2.0)', price: 11290, dealer: 9900, specs: { Functions: 'Print, Scan, Copy', Sensors: 'Low Ink Sensor Alerts' } },
      { brand: 'BROTHER', name: 'Brother DCP-T420W All-in-One Wireless Colour Ink Tank Refill System Printer', price: 12990, dealer: 11400, specs: { Speed: '16/9 ipm Fast Printing', Connectivity: 'Wireless LAN' } },
      { brand: 'EPSON', name: 'Epson EcoTank L130 Single Function Colour Ink Tank Photo & Document Printer', price: 9490, dealer: 8300, specs: { Function: 'Single Function Color', CostPerPrint: '7 Paise Black / 18 Paise Color' } },
    ]
  },

  // Security & CCTV
  'ip-cameras-poe': {
    brands: ['HIKVISION', 'CP PLUS', 'DAHUA'],
    images: ['https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'HIKVISION', name: 'Hikvision 2MP IP PoE Bullet Camera DS-2CD1023G0E-I (30m IR, IP67 Weatherproof, H.265+)', price: 2150, dealer: 1750, specs: { Resolution: '2MP 1080p', Power: 'PoE 802.3af', Protection: 'IP67 Weatherproof' } },
      { brand: 'HIKVISION', name: 'Hikvision 2MP IP PoE Dome Camera DS-2CD1123G0E-I (Vandal Proof IK10, 30m IR, H.265+)', price: 2150, dealer: 1750, specs: { Resolution: '2MP Dome', VandalProof: 'IK10 Vandal Resistance' } },
      { brand: 'CP PLUS', name: 'CP Plus 2MP IP PoE Bullet Camera CP-UNC-TA21L3-V2 (30m Night Vision, DWDR, IP67)', price: 1950, dealer: 1580, specs: { Resolution: '2MP Full HD', Protection: 'IP67 Water & Dust Resistant' } },
      { brand: 'CP PLUS', name: 'CP Plus 2MP IP PoE Dome Camera CP-UNC-DA21L3-V2 (High Performance IR LEDs, H.265)', price: 1950, dealer: 1580, specs: { Resolution: '2MP Dome', Lens: '3.6mm Fixed Lens' } },
      { brand: 'HIKVISION', name: 'Hikvision ColorVu 2MP IP PoE Bullet Camera DS-2CD1027G2-LUF (24/7 Color Night Vision, Mic)', price: 3450, dealer: 2850, specs: { Technology: 'ColorVu 24/7 Colorful Imaging', Audio: 'Built-in Audio Mic' } },
      { brand: 'DAHUA', name: 'Dahua 2MP Full-color IP PoE Bullet Camera DH-IPC-HFW1239S1-A-LED (Built-in Mic, 30m Warm LED)', price: 2650, dealer: 2200, specs: { NightVision: 'Warm Light LEDs 30m', Audio: 'Integrated High Sensitivity Mic' } },
      { brand: 'DAHUA', name: 'Dahua 4MP IP PoE Eyeball Dome Camera DH-IPC-HDW1431T1-S4 (4MP QHD, 30m IR, WDR)', price: 3850, dealer: 3200, specs: { Resolution: '4MP QHD 2560x1440', DynamicRange: '120dB True WDR' } },
      { brand: 'HIKVISION', name: 'Hikvision AcuSense 4MP IP PoE Bullet Camera DS-2CD2043G2-I (Human & Vehicle Detection)', price: 5450, dealer: 4650, specs: { AI: 'Deep Learning Human & Vehicle Classification', Resolution: '4MP QHD' } },
    ]
  },

  'hd-analog-cameras': {
    brands: ['HIKVISION', 'CP PLUS', 'DAHUA'],
    images: ['https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'HIKVISION', name: 'Hikvision 2MP HD 1080p Turbo HD Bullet Camera DS-2CE16D0T-IRPF (20m Smart IR, IP67)', price: 950, dealer: 750, specs: { Resolution: '2MP 1080p', Output: '4-in-1 (TVI/AHD/CVI/CVBS)' } },
      { brand: 'HIKVISION', name: 'Hikvision 2MP HD 1080p Turbo HD Dome Camera DS-2CE56D0T-IRPF (Indoor Security Camera)', price: 920, dealer: 720, specs: { Resolution: '2MP Dome', IRDistance: 'Up to 20m Smart IR' } },
      { brand: 'CP PLUS', name: 'CP Plus 2.4MP HD Cosmic Bullet Camera CP-VAC-T24L2 (20m IR, IP66 Weatherproof, 4-in-1)', price: 890, dealer: 690, specs: { Resolution: '2.4MP High Definition', Housing: 'All-Weather Sturdy Housing' } },
      { brand: 'CP PLUS', name: 'CP Plus 2.4MP HD Cosmic Dome Camera CP-VAC-D24L2 (High Quality IR LEDs for Night Clarity)', price: 860, dealer: 670, specs: { Resolution: '2.4MP Dome', Lens: '3.6mm High Definition Lens' } },
      { brand: 'HIKVISION', name: 'Hikvision ColorVu 2MP HD Turbo Analog Camera DS-2CE10DF0T-F (24/7 Color Night Vision F1.0)', price: 1650, dealer: 1350, specs: { Aperture: 'F1.0 Super Aperture', NightVision: 'Color Night Vision 24/7' } },
      { brand: 'DAHUA', name: 'Dahua 2MP HDCVI Bullet Camera HAC-HFW1200R (Built-in Audio Over Coaxial Cable, 20m IR)', price: 1190, dealer: 950, specs: { Audio: 'Broadcast-quality Audio over Coax', IR: 'Smart IR 20m' } },
      { brand: 'HIKVISION', name: 'Hikvision 5MP High Resolution HD Bullet Camera DS-2CE16H0T-ITPFS with Built-in Audio Mic', price: 1850, dealer: 1480, specs: { Resolution: '5MP Ultra HD', Audio: 'Coaxial Audio Microphone' } },
      { brand: 'CP PLUS', name: 'CP Plus 5MP Full HD Guard+ Analog Bullet Camera with Color Night Vision Warm LED', price: 1750, dealer: 1400, specs: { Resolution: '5MP HD', WarmLED: '20m Warm Light Night Vision' } },
    ]
  },

  'network-video-recorders': {
    brands: ['HIKVISION', 'CP PLUS', 'DAHUA'],
    images: ['https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'HIKVISION', name: 'Hikvision 4-Channel 4K NVR Network Video Recorder DS-7104NI-Q1/4P with 4 PoE Ports H.265+', price: 5490, dealer: 4650, specs: { Channels: '4 Channels with PoE', Decoding: 'Up to 4K HDMI Output' } },
      { brand: 'HIKVISION', name: 'Hikvision 8-Channel 4K NVR Network Video Recorder DS-7108NI-Q1 H.265+ 1 SATA up to 6TB', price: 4690, dealer: 3950, specs: { Channels: '8 IP Camera Channels', Resolution: 'Up to 4K Ultra HD' } },
      { brand: 'HIKVISION', name: 'Hikvision 16-Channel NVR Network Video Recorder DS-7616NI-Q2 2 SATA up to 16TB HDMI 4K', price: 8990, dealer: 7800, specs: { Channels: '16 IP Channels', Storage: '2 SATA Interfaces up to 16TB' } },
      { brand: 'CP PLUS', name: 'CP Plus 8-Channel 4K Network Video Recorder CP-UNR-308T1 1 SATA H.265+ 80Mbps Incoming Bandwidth', price: 4450, dealer: 3750, specs: { Channels: '8 Channels', Bandwidth: '80Mbps Incoming' } },
      { brand: 'CP PLUS', name: 'CP Plus 16-Channel 4K Network Video Recorder CP-UNR-316T2 2 SATA HDMI 4K Output', price: 8450, dealer: 7300, specs: { Channels: '16 Channels', Output: 'Simultaneous HDMI / VGA' } },
      { brand: 'DAHUA', name: 'Dahua 8-Channel 1U WizSense NVR NVR2108HS-I2 AI Face Recognition & Perimeter Protection', price: 6200, dealer: 5350, specs: { AI: 'WizSense AI Analytics', Channels: '8 Channels' } },
      { brand: 'DAHUA', name: 'Dahua 16-Channel 4K Network Video Recorder NVR4216-4KS2/L 2 SATA 160Mbps Bandwidth', price: 9800, dealer: 8500, specs: { Bandwidth: '160 Mbps', Decoding: 'H.265+ Smart Codec' } },
      { brand: 'HIKVISION', name: 'Hikvision 32-Channel NVR Network Video Recorder DS-7732NI-K4 4 SATA Ports Enterprise Chassis', price: 24500, dealer: 21500, specs: { Channels: '32 IP Channels', Storage: '4 SATA Drives up to 40TB' } },
    ]
  },

  // Networking
  'wifi-6-routers': {
    brands: ['TP-LINK', 'D-LINK', 'ASUS'],
    images: ['https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'TP-LINK', name: 'TP-Link Archer AX12 Dual-Band Wi-Fi 6 Gigabit Router (AX1500, OFDMA, Beamforming, WPA3)', price: 2999, dealer: 2450, specs: { Speed: 'AX1500 (1201Mbps 5GHz + 300Mbps 2.4GHz)', Gigabit: 'Gigabit WAN + 3 Gigabit LAN' } },
      { brand: 'TP-LINK', name: 'TP-Link Archer AX23 Dual-Band Wi-Fi 6 Gigabit Router (AX1800, OneMesh, 4 High-Gain Antennas)', price: 3799, dealer: 3100, specs: { Speed: 'AX1800 Dual Band', Features: 'OneMesh Compatible' } },
      { brand: 'TP-LINK', name: 'TP-Link Archer AX72 Pro AX5400 Multi-Gigabit Wi-Fi 6 Router with 2.5G Port & USB 3.0', price: 7999, dealer: 6800, specs: { MultiGig: '2.5 Gbps Port', Speed: 'AX5400 Ultra High Speed' } },
      { brand: 'D-LINK', name: 'D-Link EAGLE PRO AI AX1500 Wi-Fi 6 Smart Router R15 with AI Traffic Optimizer', price: 2699, dealer: 2200, specs: { Speed: 'AX1500 Dual Band', AI: 'AI Wi-Fi & Mesh Optimizer' } },
      { brand: 'D-LINK', name: 'D-Link DIR-X1860 EXO AX1800 Wi-Fi 6 Gigabit Router with Voice Assistant Control', price: 3499, dealer: 2850, specs: { Speed: 'AX1800', VoiceControl: 'Works with Alexa & Google' } },
      { brand: 'ASUS', name: 'Asus RT-AX53U Dual Band Wi-Fi 6 Router (AX1800 | AiProtection Security | USB Port 4G Dongle)', price: 4499, dealer: 3800, specs: { Speed: 'AX1800 Wi-Fi 6', Security: 'TrendMicro AiProtection Free' } },
      { brand: 'TP-LINK', name: 'TP-Link Deco X20 AX1800 Whole Home Mesh Wi-Fi 6 System (Pack of 2 Units Seamless Roaming)', price: 8999, dealer: 7600, specs: { Mesh: 'Pack of 2 Mesh Nodes', Coverage: 'Up to 4000 sq ft' } },
      { brand: 'ASUS', name: 'Asus ROG Rapture GT-AX6000 Dual-Band Wi-Fi 6 Gaming Router (Dual 2.5G Ports, Mobile Game Mode)', price: 24999, dealer: 21800, specs: { Gaming: 'Triple-Level Game Acceleration', Speed: 'AX6000 Extreme' } },
    ]
  },

  'poe-switches': {
    brands: ['TP-LINK', 'D-LINK', 'HIKVISION', 'DAHUA'],
    images: ['https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'TP-LINK', name: 'TP-Link TL-SF1005P 5-Port 10/100Mbps Desktop PoE Switch with 4-Port PoE+ (67W Power Budget)', price: 2199, dealer: 1780, specs: { Ports: '5 RJ45 Ports (4 PoE+)', Budget: '67 Watts PoE Budget' } },
      { brand: 'TP-LINK', name: 'TP-Link TL-SG1008P 8-Port Gigabit Desktop PoE Switch with 4 PoE+ Ports (64W Budget)', price: 4699, dealer: 3950, specs: { Ports: '8 Gigabit (4 PoE+)', Speed: '10/100/1000 Mbps Gigabit' } },
      { brand: 'D-LINK', name: 'D-Link DGS-1008P 8-Port Gigabit Unmanaged Desktop PoE Switch (4 PoE Ports 68W)', price: 4499, dealer: 3750, specs: { Standard: 'IEEE 802.3af/at PoE+', Ports: '8 Gigabit Ports' } },
      { brand: 'D-LINK', name: 'D-Link DES-1008PA 8-Port Fast Ethernet PoE Desktop Switch with 4 PoE Ports (52W Budget)', price: 2399, dealer: 1950, specs: { Ports: '8 x 10/100 Ports', PoEPorts: '4 PoE Ports' } },
      { brand: 'HIKVISION', name: 'Hikvision DS-3E0105P-E/M 4-Port 100M Long-Range 250m PoE Switch (4 PoE + 1 Uplink, 35W)', price: 1899, dealer: 1520, specs: { Range: 'Up to 250m Extend Mode', Ports: '4 PoE + 1 Uplink Port' } },
      { brand: 'HIKVISION', name: 'Hikvision DS-3E0109P-E/M 8-Port Long-Range PoE Switch with 1 Uplink Port (60W Budget)', price: 2999, dealer: 2480, specs: { Ports: '8 PoE + 1 Uplink', Range: '250m Long Range CCTV Transmission' } },
      { brand: 'DAHUA', name: 'Dahua DH-PFS3008-8ET-65 8-Port Fast Ethernet Unmanaged Desktop PoE Switch (65W Budget)', price: 2850, dealer: 2350, specs: { Ports: '8 PoE Ports', Mode: 'Red Port 90W Hi-PoE Supported' } },
      { brand: 'TP-LINK', name: 'TP-Link TL-SG1016PE 16-Port Gigabit Easy Smart Rackmount PoE Switch (8 PoE+ Ports 150W)', price: 11999, dealer: 10400, specs: { Managed: 'Easy Smart QoS & VLAN', Budget: '150W PoE Power Budget' } },
    ]
  },

  // Software
  'operating-systems-office': {
    brands: ['MICROSOFT'],
    images: ['https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'MICROSOFT', name: 'Microsoft Windows 11 Professional 64-Bit OEM DVD / License Key Pack Genuine', price: 9490, dealer: 8200, specs: { License: 'OEM 1-PC Lifetime', Architecture: '64-Bit Genuine' } },
      { brand: 'MICROSOFT', name: 'Microsoft Windows 11 Home 64-Bit Retail USB Drive / License Key Genuine', price: 8290, dealer: 7150, specs: { License: 'Retail Transferable', OS: 'Windows 11 Home' } },
      { brand: 'MICROSOFT', name: 'Microsoft Office Home & Student 2021 One-Time Purchase for 1 PC or Mac', price: 7990, dealer: 6900, specs: { Inclusions: 'Word, Excel, PowerPoint', Validity: 'Lifetime 1 Device' } },
      { brand: 'MICROSOFT', name: 'Microsoft Office Home & Business 2021 Commercial License for 1 PC or Mac', price: 18990, dealer: 16500, specs: { Inclusions: 'Word, Excel, PowerPoint, Outlook', Commercial: 'Licensed for Business' } },
      { brand: 'MICROSOFT', name: 'Microsoft 365 Personal 1-Year Subscription for 1 Person (1TB OneDrive Cloud Storage)', price: 4190, dealer: 3600, specs: { Term: '12 Months Subscription', Cloud: '1TB Secure OneDrive Cloud' } },
      { brand: 'MICROSOFT', name: 'Microsoft 365 Family 1-Year Subscription for up to 6 People (6TB Total Cloud Storage)', price: 5390, dealer: 4650, specs: { Sharing: 'Up to 6 Users', Cloud: '1TB per person (6TB Total)' } },
      { brand: 'MICROSOFT', name: 'Microsoft Windows 10 Pro 64-Bit System Builder OEM Pack Genuine', price: 8990, dealer: 7800, specs: { License: 'OEM 1-PC', Features: 'BitLocker & Remote Desktop' } },
      { brand: 'MICROSOFT', name: 'Microsoft Windows Server 2022 Standard Edition 16-Core License Genuine', price: 74990, dealer: 67000, specs: { License: '16-Core Base License', OS: 'Windows Server 2022' } },
    ]
  },

  'antivirus-endpoint-security': {
    brands: ['QUICK HEAL', 'KASPERSKY', 'MCAFEE'],
    images: ['https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'QUICK HEAL', name: 'Quick Heal Total Security 1 User 1 Year Antivirus for PC CD / License Key', price: 1199, dealer: 890, specs: { Users: '1 PC / 1 Year', Protection: 'Ransomware, Web & Banking Security' } },
      { brand: 'QUICK HEAL', name: 'Quick Heal Total Security 1 User 3 Years Antivirus for PC Genuine Box Pack', price: 2199, dealer: 1650, specs: { Users: '1 PC / 3 Years', Value: 'Best 3-Year Value Pack' } },
      { brand: 'QUICK HEAL', name: 'Quick Heal Total Security 3 Users 1 Year Family Pack Antivirus Software', price: 1899, dealer: 1420, specs: { Users: '3 PCs / 1 Year', MultiDevice: 'Family Security Pack' } },
      { brand: 'QUICK HEAL', name: 'Quick Heal Internet Security 1 User 1 Year Genuine Protection Software', price: 849, dealer: 620, specs: { Users: '1 PC / 1 Year', Shield: 'Safe Banking & Phishing Shield' } },
      { brand: 'KASPERSKY', name: 'Kaspersky Standard Antivirus 1 Device 1 Year Real-Time Anti-Phishing Security', price: 599, dealer: 420, specs: { Users: '1 Device / 1 Year', Protection: 'Triple-Layer Security' } },
      { brand: 'KASPERSKY', name: 'Kaspersky Plus Total Internet Security 1 Device 1 Year with Unlimited VPN', price: 999, dealer: 750, specs: { Features: 'Antivirus + Performance + Fast VPN', Users: '1 Device / 1 Year' } },
      { brand: 'MCAFEE', name: 'McAfee Total Protection 1 User 1 Year Complete Antivirus & Identity Defense', price: 699, dealer: 490, specs: { Protection: 'Password Manager & Web Advisor', Users: '1 PC / 1 Year' } },
      { brand: 'MCAFEE', name: 'McAfee Total Protection 3 Devices 3 Years Multi-Device Comprehensive Security', price: 1799, dealer: 1320, specs: { Duration: '3 Years / 3 Devices', Compatibility: 'Windows, Mac, Android, iOS' } },
    ]
  },

  // Mobility
  'laptop-bags-sleeves': {
    brands: ['LENOVO', 'HP', 'DELL', 'AMERICAN TOURISTER'],
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'LENOVO', name: 'Lenovo 15.6" Laptop Everyday Backpack B210 Water-Repellent Lightweight Charcoal Black', price: 899, dealer: 680, specs: { Capacity: 'Fits up to 15.6" Laptops', Material: 'High Quality Water Repellent' } },
      { brand: 'HP', name: 'HP Prelude 15.6-inch Laptop Backpack with Padded Shoulder Straps Grey', price: 799, dealer: 590, specs: { Size: 'Fits up to 15.6"', Ergonomics: 'Padded Mesh Back Panel' } },
      { brand: 'DELL', name: 'Dell Essential Backpack 15 ES1520P with Reflective Prints for Night Visibility', price: 1099, dealer: 820, specs: { Protection: 'Cushioned Laptop Sleeve', Reflective: 'High-Visibility Prints' } },
      { brand: 'HP', name: 'HP 15.6-inch Laptop Sleeve Case with Reversible Neoprene Black and Geometric Pattern', price: 599, dealer: 420, specs: { Material: 'Reversible Neoprene', Thickness: 'Scratch & Bump Resistant' } },
      { brand: 'LENOVO', name: 'Lenovo ThinkPad Professional 15.6" Premium Executive Business Backpack', price: 2499, dealer: 1950, specs: { Pockets: 'Dedicated Tablet & Smart Pockets', Material: 'Ballistic Nylon' } },
      { brand: 'DELL', name: 'Dell Pro Slim Backpack 15 PO1520PS Eco-friendly EVA Foam Cushioning', price: 1699, dealer: 1300, specs: { EcoFriendly: 'Earth-friendly Dyeing Process', Sleeve: 'EVA Foam Cushioning' } },
      { brand: 'AMERICAN TOURISTER', name: 'American Tourister 32 Ltrs Casual Laptop Backpack with Rain Cover & 3 Compartments', price: 1599, dealer: 1200, specs: { Capacity: '32 Litres Spacious', RainCover: 'Integrated Waterproof Cover' } },
      { brand: 'HP', name: 'HP Odyssey 15.6" Military-Style Rugged Laptop Backpack with Dedicated Tablet Pocket', price: 2199, dealer: 1680, specs: { Styling: 'Geometric Facet Pattern', Straps: 'Air-Mesh Contoured Straps' } },
    ]
  },

  // Cables
  'hdmi-display-cables': {
    brands: ['ZEBRONICS', 'PORTRONICS', 'TERABYTE', 'AMAZONBASICS'],
    images: ['https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'ZEBRONICS', name: 'Zebronics 1.5m High Speed HDMI 2.0 Cable 4K Ultra HD 60Hz 18Gbps Gold Plated', price: 249, dealer: 160, specs: { Resolution: '4K @ 60Hz Ultra HD', Connectors: '24K Gold Plated Male to Male' } },
      { brand: 'ZEBRONICS', name: 'Zebronics 3.0m High Speed 4K HDMI Cable with Ethernet & Audio Return Channel', price: 399, dealer: 270, specs: { Length: '3.0 Meters', Shielding: 'Triple Shielded Copper' } },
      { brand: 'PORTRONICS', name: 'Portronics Konnect 4K Ultra HD 2.0 HDMI Cable 2m Braided Nylon Durable Jacket', price: 349, dealer: 230, specs: { Jacket: 'Tangle-Free Braided Nylon', Audio: 'Supports Dolby TrueHD & DTS-HD' } },
      { brand: 'TERABYTE', name: 'Terabyte 5.0m Heavy Duty Gold Plated HDMI 1.4/2.0 Cable for Projector & TV', price: 499, dealer: 340, specs: { Length: '5.0 Meters', Application: 'Projectors, CCTV NVR & Monitors' } },
      { brand: 'TERABYTE', name: 'Terabyte 10.0m Long Range High Speed HDMI Cable with Ferrite Core Filters', price: 899, dealer: 620, specs: { Length: '10 Meters Long Range', Filters: 'Dual Magnetic Ferrite Rings' } },
      { brand: 'AMAZONBASICS', name: 'DisplayPort to DisplayPort 1.4 Cable 1.8m 8K 60Hz / 4K 144Hz Gaming Cable', price: 699, dealer: 480, specs: { Standard: 'DP 1.4 32.4 Gbps', RefreshRate: 'Supports 4K 144Hz & 2K 240Hz' } },
      { brand: 'PORTRONICS', name: 'Portronics DisplayPort to HDMI 1.8m Converter Cable 1080p FHD Male to Male', price: 449, dealer: 310, specs: { Type: 'DP Male to HDMI Male', Video: '1080p Full HD 60Hz' } },
      { brand: 'TERABYTE', name: 'Terabyte 1.5m Premium VGA to VGA Monitor Cable with Dual Ferrite Cores', price: 199, dealer: 120, specs: { Connector: 'VGA 15-Pin Male to Male', Cores: 'Anti-Interference Ferrite Cores' } },
    ]
  },

  'ethernet-patch-cables': {
    brands: ['D-LINK', 'TP-LINK', 'SCHNEIDER'],
    images: ['https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'D-LINK', name: 'D-Link Cat6 UTP 1.0m Factory Crimped Patch Cord RJ45 Gigabit Ethernet Cable Blue', price: 120, dealer: 75, specs: { Category: 'Cat6 250MHz', Conductor: '100% Bare Copper 24AWG' } },
      { brand: 'D-LINK', name: 'D-Link Cat6 UTP 2.0m High Speed Patch Cord RJ45 Gigabit Ethernet Cable Grey', price: 160, dealer: 95, specs: { Speed: '1000 Mbps Gigabit', Connectors: 'Gold Plated RJ45 Pins' } },
      { brand: 'D-LINK', name: 'D-Link Cat6 UTP 5.0m High Performance Patch Cord RJ45 Network Cable Yellow', price: 280, dealer: 180, specs: { Length: '5.0 Meters', Jacket: 'Molded Snagless Boot' } },
      { brand: 'D-LINK', name: 'D-Link Cat6 UTP 10.0m Factory Crimped Network Patch Cable RJ45 Blue', price: 480, dealer: 310, specs: { Length: '10.0 Meters', Standard: 'TIA/EIA 568-C.2 Verified' } },
      { brand: 'TP-LINK', name: 'TP-Link Cat6 RJ45 Gigabit Ethernet Patch Cord 3.0m High Speed LAN Cable', price: 210, dealer: 135, specs: { Speed: '1 Gbps Gigabit Speed', Frequency: 'Up to 250 MHz' } },
      { brand: 'D-LINK', name: 'D-Link Cat6 UTP 305m Solid Copper Cable Box for CCTV & Structured Cabling', price: 7999, dealer: 6800, specs: { Length: '305 Meters (1000 Ft) Pull Box', Material: 'Solid Pure Copper 23AWG' } },
      { brand: 'SCHNEIDER', name: 'Schneider Actassi Cat6 UTP 2.0m Gigabit Snagless Network Patch Cord Grey', price: 190, dealer: 120, specs: { Brand: 'Schneider Electric', Rating: 'Enterprise Grade Cat6' } },
      { brand: 'D-LINK', name: 'D-Link Cat6 RJ45 Modular Plugs Pack of 100 Connectors 50-Micron Gold Plated', price: 550, dealer: 380, specs: { Quantity: '100 Plugs Pack', ContactPins: '3-Prong Gold Plated' } },
    ]
  },

  // Connectors & Converters
  'usbc-hubs-docking-stations': {
    brands: ['PORTRONICS', 'ZEBRONICS', 'DELL', 'HP'],
    images: ['https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'PORTRONICS', name: 'Portronics MPort 4B USB 3.0 4-Port Hub with 5Gbps Data Transfer Speed', price: 499, dealer: 360, specs: { Ports: '4 x USB 3.0 Type-A', Speed: '5 Gbps High Speed' } },
      { brand: 'PORTRONICS', name: 'Portronics MPort 7A 7-in-1 Type-C Multiport Hub with 4K HDMI, 87W PD, 3xUSB, SD/TF Slot', price: 1699, dealer: 1280, specs: { Video: '4K @ 30Hz HDMI', PowerDelivery: '87W Type-C Pass Through' } },
      { brand: 'ZEBRONICS', name: 'Zebronics Zeb-H300 USB Type-C to 4-Port USB 3.0 Aluminium Alloy Multiport Adapter', price: 699, dealer: 490, specs: { Body: 'Premium Aluminium Shell', Ports: '4 SuperSpeed Ports' } },
      { brand: 'PORTRONICS', name: 'Portronics MPort 9M 9-in-1 Type C Hub with Gigabit Ethernet RJ45, 4K HDMI, 100W PD', price: 2499, dealer: 1900, specs: { Ethernet: '1000 Mbps RJ45 Gigabit', Charging: '100W PD Charging' } },
      { brand: 'DELL', name: 'Dell 7-in-1 USB-C Multiport Mobile Adapter DA310 Compact Hockey Puck Design', price: 7490, dealer: 6300, specs: { Design: 'Integrated Retractable Cable', Video: 'HDMI, DP, VGA, Type-C' } },
      { brand: 'HP', name: 'HP USB-C Travel Hub G2 with HDMI, VGA, 2x USB Ports & Pass-Through Power', price: 4990, dealer: 4100, specs: { Travel: 'Ultra Compact Travel Size', Ports: 'HDMI, VGA, 2x USB-A' } },
      { brand: 'ZEBRONICS', name: 'Zebronics Type-C to HDMI 4K UHD Adapter Converter Cable with Aluminium Casing', price: 799, dealer: 550, specs: { Resolution: '4K UHD 3840x2160', Compatibility: 'MacBook, Laptops & Smartphones' } },
      { brand: 'PORTRONICS', name: 'Portronics USB-C to Gigabit Ethernet RJ45 Network Adapter 1000Mbps Aluminium', price: 899, dealer: 620, specs: { Speed: '10/100/1000 Mbps Gigabit', Driver: 'Plug and Play No Drivers' } },
    ]
  },

  // Accessories CCTV & Networking
  'cctv-power-supplies-smps': {
    brands: ['CP PLUS', 'HIKVISION', 'ERD'],
    images: ['https://images.unsplash.com/photo-1597740985671-2a8a3b80532e?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'CP PLUS', name: 'CP Plus 4-Channel 12V 5A CCTV Camera SMPS Power Supply CP-DPS-MD50-12D Metal Box', price: 650, dealer: 460, specs: { Channels: '4 Camera Output', Protection: 'Surge & Short Circuit Protection' } },
      { brand: 'CP PLUS', name: 'CP Plus 8-Channel 12V 10A CCTV Camera SMPS Power Supply CP-DPS-MD100-12D Metal Casing', price: 950, dealer: 720, specs: { Channels: '8 Camera Output', Rating: '12V DC 10A Stabilized' } },
      { brand: 'CP PLUS', name: 'CP Plus 16-Channel 12V 20A Heavy Duty CCTV SMPS Power Supply with Cooling Fan', price: 1650, dealer: 1280, specs: { Channels: '16 Camera Output', Cooling: 'Built-in Exhaust Fan' } },
      { brand: 'HIKVISION', name: 'Hikvision 4-Channel 12V 5A Metal Box CCTV Camera Switching Power Supply', price: 720, dealer: 520, specs: { Output: '12V 5A Distributed', Casing: 'Sturdy Metal Perforated Box' } },
      { brand: 'HIKVISION', name: 'Hikvision 8-Channel 12V 10A Regulated CCTV SMPS Power Supply Unit', price: 1050, dealer: 790, specs: { Output: '12V 10A Clean Power', Protection: 'Overload & Voltage Fluctuation' } },
      { brand: 'ERD', name: 'ERD 4-Channel 12V 5A Heavy Duty CCTV SMPS Power Supply Made in India', price: 580, dealer: 410, specs: { Efficiency: 'High Energy Efficiency SMPS', Warranty: '2 Years Manufacturer' } },
      { brand: 'ERD', name: 'ERD 8-Channel 12V 10A Pure Copper Transformer CCTV Power Supply', price: 880, dealer: 650, specs: { Rating: '12V 10A Continuous', Build: 'BIS Approved Indian Standard' } },
      { brand: 'CP PLUS', name: 'CP Plus Single Camera 12V 2A SMPS Adapter with Indian 2-Pin Plug', price: 220, dealer: 140, specs: { Rating: '12V 2A Regulated', Inclusions: 'DC Barrel Jack' } },
    ]
  },

  // Telecom
  'voip-ip-telephones': {
    brands: ['GRANDSTREAM', 'YEALINK', 'CISCO'],
    images: ['https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'GRANDSTREAM', name: 'Grandstream GXP1625 2-Line HD IP Phone with Integrated PoE & Backlit LCD Display', price: 3490, dealer: 2950, specs: { Lines: '2 SIP Accounts', Screen: '132x48 Backlit Graphic LCD', PoE: 'Integrated PoE' } },
      { brand: 'GRANDSTREAM', name: 'Grandstream GRP2602P 2-Line Carrier-Grade Essential IP Phone with Dual Gigabit Ports', price: 3890, dealer: 3300, specs: { Lines: '2 SIP Accounts / 4 Lines', Audio: 'Full Duplex Speakerphone with HD Audio' } },
      { brand: 'YEALINK', name: 'Yealink SIP-T31P 2-Line Entry-Level PoE IP Phone with Large 2.3-inch Backlit LCD', price: 3690, dealer: 3100, specs: { Display: '2.3" 132x64 Pixel Graphical LCD', Audio: 'Yealink HD Voice' } },
      { brand: 'YEALINK', name: 'Yealink SIP-T33G 4-Line Color Screen Gigabit IP Phone with Dual Port Gigabit & PoE', price: 5490, dealer: 4650, specs: { Screen: '2.4" 320x240 Color Display', Gigabit: 'Dual Port Gigabit Ethernet' } },
      { brand: 'CISCO', name: 'Cisco 6821 Multiplatform IP Phone with 2 SIP Lines and PoE (CP-6821-3PCC-K9=)', price: 5990, dealer: 5100, specs: { Brand: 'Cisco Enterprise', Security: 'Encrypted Voice Communications' } },
      { brand: 'GRANDSTREAM', name: 'Grandstream GXP2170 12-Line Enterprise IP Phone with 4.3" Color LCD & 48 Digital BLF Keys', price: 9890, dealer: 8400, specs: { Lines: '12 Lines / 6 SIP Accounts', Screen: '4.3" 480x272 Color LCD' } },
      { brand: 'YEALINK', name: 'Yealink W73P High-Performance Cordless DECT IP Phone System (Base + Handset)', price: 8990, dealer: 7600, specs: { Mobility: 'DECT Wireless Handset', Range: 'Up to 50m Indoor / 300m Outdoor' } },
      { brand: 'GRANDSTREAM', name: 'Grandstream HT801 1-Port Single FXS Analog Telephone Adapter (ATA) for VoIP Migration', price: 2890, dealer: 2350, specs: { Port: '1 FXS Telephone Port', Routing: 'Advanced NAT Router' } },
    ]
  },

  // Mobile
  'enterprise-smartphones': {
    brands: ['SAMSUNG', 'ZEBRA', 'MOTOROLA'],
    images: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80'],
    items: [
      { brand: 'SAMSUNG', name: 'Samsung Galaxy XCover 6 Pro Enterprise Edition 5G Rugged Smartphone (6GB | 128GB | MIL-STD-810H)', price: 38990, dealer: 34500, specs: { Durability: 'IP68 & MIL-STD-810H Rugged', Battery: 'Removable 4050mAh' } },
      { brand: 'SAMSUNG', name: 'Samsung Galaxy XCover 5 Enterprise Rugged Handheld (4GB RAM | 64GB | Glove Touch Screen)', price: 24990, dealer: 21800, specs: { Durability: 'Drop-tested 1.5m', Screen: 'Sensitive Glove Touch' } },
      { brand: 'ZEBRA', name: 'Zebra TC21 Enterprise Touch Computer Barcode Scanner Handheld Mobile Computer', price: 29990, dealer: 26500, specs: { Scanner: 'Built-in 1D/2D Barcode Imager', OS: 'Android Enterprise Recommended' } },
      { brand: 'ZEBRA', name: 'Zebra TC26 Healthcare & Rugged Enterprise Mobile Touch Computer with 4G LTE WAN', price: 34990, dealer: 30800, specs: { Connectivity: 'Cellular 4G LTE + Wi-Fi', Housing: 'Disinfectant Ready Housing' } },
      { brand: 'SAMSUNG', name: 'Samsung Galaxy Tab Active4 Pro Enterprise Rugged Tablet 10.1" (6GB | 128GB | S Pen | 5G)', price: 49990, dealer: 44200, specs: { Screen: '10.1" WUXGA Gorilla Glass 5', Pen: 'Water Resistant IP68 S-Pen' } },
      { brand: 'MOTOROLA', name: 'Motorola ThinkPhone by Lenovo Enterprise Security 5G (8GB | 256GB | ThinkShield Protection)', price: 44990, dealer: 39500, specs: { Security: 'ThinkShield for Mobile', Build: 'Aramid Fiber & Aircraft Aluminium' } },
      { brand: 'SAMSUNG', name: 'Samsung Galaxy A15 5G Enterprise Knox Security Edition (6GB | 128GB | 50MP Triple Camera)', price: 16990, dealer: 15200, specs: { Security: 'Samsung Knox Vault', Battery: '5000mAh 25W Fast Charge' } },
      { brand: 'ZEBRA', name: 'Zebra TC53 Next-Generation Wi-Fi 6E Rugged Enterprise Mobile Computer', price: 54990, dealer: 48500, specs: { 'Wi-Fi': 'Wi-Fi 6E Fast Roaming', Imager: 'SE4720 1D/2D Advanced Scan Engine' } },
    ]
  },
};

// Aliases for subcategories that map to same parent equipment group
const SLUG_ALIASES = {
  'business-laptops': 'ultrabooks',
  'gaming-laptops': 'rtx-gaming-laptops',
  'all-in-one-pcs': 'touchscreen-aio',
  'gaming-desktops': 'intel-gaming-pcs',
  'tower-workstations': 'cad-rendering-workstations',
  'cctv-cameras': 'ip-cameras-poe',
  'video-recorders': 'network-video-recorders',
  'routers-gateways': 'wifi-6-routers',
  'network-switches': 'poe-switches',
};

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vinexus');
  console.log('Connected to MongoDB.');

  const allCategories = await Category.find({}).lean();
  console.log(`Loaded ${allCategories.length} categories.`);

  console.log('Cleaning previously seeded VN- products to ensure accurate categorization...');
  await Product.deleteMany({ sku: /^VN-/ });

  let createdCount = 0;
  let updatedCount = 0;

  // Process all generator categories
  for (const [catSlug, gen] of Object.entries(CATEGORY_GENERATORS)) {
    const category = allCategories.find((c) => c.slug === catSlug);
    if (!category) {
      console.warn(`Category not found for slug: ${catSlug}`);
      continue;
    }

    for (let i = 0; i < gen.items.length; i++) {
      const item = gen.items[i];
      const imageUrl = gen.images[i % gen.images.length];
      const sku = `VN-${item.brand.replace(/\s+/g, '')}-${catSlug.replace(/-/g, '').toUpperCase()}-${String(i + 1).padStart(3, '0')}`;

      // Convert specs object to array
      const specifications = [{ key: 'Brand', value: item.brand }];
      if (item.specs) {
        for (const [k, v] of Object.entries(item.specs)) {
          specifications.push({ key: k, value: String(v) });
        }
      }

      const existingProduct = await Product.findOne({ sku });
      if (existingProduct) {
        existingProduct.name = item.name;
        existingProduct.categoryId = category._id;
        existingProduct.standardPrice = item.price;
        existingProduct.dealerPrice = item.dealer;
        existingProduct.images = [{ url: imageUrl, altText: item.name }];
        existingProduct.specifications = specifications;
        existingProduct.isActive = true;
        await existingProduct.save();
        updatedCount++;
      } else {
        await Product.create({
          sku,
          name: item.name,
          categoryId: category._id,
          standardPrice: item.price,
          dealerPrice: item.dealer,
          images: [{ url: imageUrl, altText: item.name }],
          specifications,
          description: `${item.name}. Genuine equipment with manufacturer warranty, available at ViNexus Jaipur.`,
          isActive: true,
          isFeatured: item.price > 40000,
        });
        createdCount++;
      }
    }
  }

  console.log('====================================');
  console.log('All Store Categories Seeded Successfully!');
  console.log(`Created: ${createdCount} products`);
  console.log(`Updated: ${updatedCount} products`);
  console.log('====================================');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
