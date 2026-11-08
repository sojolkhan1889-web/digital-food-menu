// Initial Mock Food Catalog for Restaurants
import burgerPng from '../assets/burger_hd.png';
import pizzaPng from '../assets/pizza_hd.png';
import chickenPng from '../assets/korean_chicken_hd.png';
import macchiatoPng from '../assets/iced_macchiato_hd.png';
import foodGif from '../assets/Food.gif';
import iceCreamPng from '../assets/ice_cream.png';
import kacchiBiryaniPng from '../assets/kacchi_biryani.png';
import coffeePng from '../assets/coffee.png';

export const initialFoods = [
  {
    id: '1',
    title: 'Double Flame Cheeseburger',
    tag: 'Best Selling',
    rating: 4.9,
    ratingCount: 142,
    category: 'Main Course',
    subcategory: 'Burgers',
    price: 15.99,
    oldPrice: 19.99,
    description: 'Freshly flame-grilled double beef patties stacked with melted Wisconsin cheddar, ripe vine tomatoes, crisp lettuce, and artisan pickles.',
    ingredients: ['100% Angus Beef', 'Wisconsin Cheddar', 'Brioche Bun', 'Crispy Greens', 'Secret Burger Sauce'],
    image: burgerPng,
    isPng: true,
    is_published: true,
    status: 'published',
    themeColor: '#EA580C',
    ambientGlow: 'rgba(234, 88, 12, 0.45)',
    gradient: 'from-orange-500/25 via-red-500/15 to-transparent',
    customizable: {
      portions: [
        { name: 'Regular Double Stack', extra: 0, price: 15.99, oldPrice: 19.99 },
        { name: 'Royale Triple Stack', extra: 3.50, price: 19.49, oldPrice: 23.49 }
      ],
      spiceLevels: ['Mild Classic', 'Zesty Pepper', 'Fire Jalapeño'],
      addons: [
        { id: 'addon_1793834060890_0', name: 'Extra Melted Cheddar', price: 1.5 },
        { id: 'addon_1793834060890_1', name: 'Crispy Smoked Beef Bacon', price: 2.2 },
        { id: 'addon_1793834060890_2', name: 'Truffle Aioli Dip', price: 1.5 }
      ]
    }
  },
  {
    id: '2',
    title: 'Artisan Wood-Fired Pizza',
    tag: 'Chef Special',
    rating: 4.8,
    ratingCount: 98,
    category: 'Main Course',
    subcategory: 'Pizza',
    price: 18.50,
    oldPrice: 24.00,
    description: 'Crispy wood-fired sourdough crust topped with San Marzano tomato sauce, mozzarella pearls, basil leaves, and fragrant virgin olive oil.',
    ingredients: ['Sourdough Crust', 'Mozzarella di Bufala', 'San Marzano Sauce', 'Fresh Basil', 'EVOO'],
    image: pizzaPng,
    isPng: true,
    is_published: true,
    status: 'published',
    themeColor: '#DC2626',
    ambientGlow: 'rgba(220, 38, 38, 0.45)',
    gradient: 'from-red-500/25 via-amber-600/15 to-transparent',
    customizable: {
      portions: [
        { name: '10" Medium Stonebake', extra: 0 },
        { name: '14" Family Stonebake', extra: 5.50 }
      ],
      spiceLevels: ['Original Italian Herb', 'Chili Flakes Crust'],
      addons: [
        { id: 'burrata', name: 'Fresh Burrata Crown', price: 3.00 },
        { id: 'garlic_crust', name: 'Garlic Butter Stuffed Crust', price: 2.50 }
      ]
    }
  },
  {
    id: '3',
    title: 'Korean Gochujang Crisp Chicken',
    tag: 'Top Rated',
    rating: 4.9,
    ratingCount: 175,
    category: 'Appetizers',
    subcategory: 'Fried Chicken',
    price: 16.50,
    oldPrice: 21.00,
    description: 'Extra-crunchy twice-fried chicken drumsticks glazed in sweet & savory Gochujang chili lacquer, toasted sesame, and fresh scallions.',
    ingredients: ['Crispy Chicken', 'Sweet Chili Glaze', 'Toasted Sesame', 'Scallions', 'Pickled Radish'],
    image: chickenPng,
    isPng: true,
    is_published: true,
    status: 'published',
    themeColor: '#E11D48',
    ambientGlow: 'rgba(225, 29, 72, 0.45)',
    gradient: 'from-rose-500/25 via-pink-600/15 to-transparent',
    customizable: {
      portions: [
        { name: '6 Pcs Crispy Set', extra: 0 },
        { name: '10 Pcs Party Box', extra: 6.00 }
      ],
      spiceLevels: ['Sweet Garlic Soy', 'Spicy Gochujang', 'Volcano Red'],
      addons: [
        { id: 'extra_radish', name: 'Pickled Daikon Radish', price: 1.20 },
        { id: 'snow_cheese', name: 'Snowy Parmesan Dust', price: 1.50 }
      ]
    }
  },
  {
    id: '4',
    title: 'Iced Caramel Macchiato',
    tag: 'Best Selling',
    rating: 4.9,
    ratingCount: 210,
    category: 'Beverages',
    subcategory: 'Coffee',
    price: 119.20,
    oldPrice: 149.00,
    description: 'Chilled freshly extracted espresso poured gently over whole milk, vanilla bean syrup, ice cubes, and a rich buttery caramel drizzle.',
    ingredients: ['Double Espresso Shot', 'Whole Milk', 'Bourbon Vanilla Syrup', 'Buttery Caramel Drizzle', 'Clear Ice'],
    image: macchiatoPng,
    isPng: true,
    is_published: true,
    status: 'published',
    themeColor: '#0284C7',
    ambientGlow: 'rgba(2, 132, 199, 0.45)',
    gradient: 'from-sky-500/25 via-blue-600/15 to-transparent',
    customizable: {
      portions: [
        { name: 'Regular Glass (350ml)', extra: 0, price: 119.2, oldPrice: 149 },
        { name: 'Grande Jar (500ml)', extra: 80.8, price: 200, oldPrice: 250 }
      ],
      spiceLevels: ['Standard Sweetness', 'Less Sweet (50%)', 'Zero Sugar'],
      addons: [
        { id: 'addon_1793977855190_0', name: 'Extra Espresso Shot', price: 50 },
        { id: 'addon_1793977855190_1', name: 'Vanilla Whipped Cream', price: 50 },
        { id: 'addon_1793977855190_2', name: 'Barista Oat Milk', price: 50 }
      ]
    }
  },
  {
    id: '5',
    title: 'Royal Pistachio Kunafa',
    tag: 'New Item',
    rating: 5.0,
    ratingCount: 64,
    category: 'Dessert',
    subcategory: 'Traditional Sweets',
    price: 12.50,
    oldPrice: 15.00,
    description: 'Crispy golden spun kataifi pastry layered with melted sweet akawi cheese, soaked in aromatic rose-cardamom syrup and crowned with crushed Turkish pistachios.',
    ingredients: ['Crispy Kataifi Pastry', 'Gooey Sweet Cheese', 'Rose Blossom Syrup', 'Turkish Pistachios', 'Pure Ghee'],
    image: foodGif,
    isPng: false,
    is_published: true,
    status: 'published',
    themeColor: '#D97706',
    ambientGlow: 'rgba(217, 119, 6, 0.45)',
    gradient: 'from-amber-500/25 via-yellow-600/15 to-transparent',
    customizable: {
      portions: [
        { name: 'Classic Single Serve (200g)', extra: 0 },
        { name: 'Royal Platter Share (450g)', extra: 4.50 }
      ],
      spiceLevels: ['Standard Syrup', 'Mild Sweetness (Light Syrup)'],
      addons: [
        { id: 'extra_pistachio', name: 'Extra Roasted Pistachios', price: 1.80 },
        { id: 'clotted_cream', name: 'Ashta Clotted Cream Dollop', price: 2.00 },
        { id: 'vanilla_gelato', name: 'Artisan Vanilla Gelato Scoop', price: 2.50 }
      ]
    }
  },
  {
    id: '1793463555418',
    title: 'ICE CREAM',
    tag: 'Best Selling',
    rating: 5.0,
    ratingCount: 1,
    category: 'Beverages',
    subcategory: 'Ice-Cream',
    price: 225.00,
    oldPrice: 281.25,
    description: 'Creamy chilled handcrafted ice cream layered with rich dairy notes and exquisite textures.',
    ingredients: ['Fresh Cream', 'Pure Vanilla', 'Chilled Delight'],
    image: iceCreamPng,
    isPng: true,
    is_published: true,
    status: 'published',
    themeColor: '#06B6D4',
    ambientGlow: 'rgba(6, 182, 212, 0.45)',
    gradient: 'from-cyan-500/25 via-blue-500/15 to-transparent',
    customizable: {
      portions: [
        { name: 'Half', extra: 0, price: 225, oldPrice: 281.25 },
        { name: 'Full', extra: 95, price: 320, oldPrice: 376.25 }
      ],
      addons: [
        { id: 'addon_1794010371052_0', name: 'Extra Egg', price: 30 },
        { id: 'addon_1794010371052_1', name: 'Extra Meat', price: 120 }
      ]
    }
  },
  {
    id: '1793622271272',
    title: 'KACCHI BIRYANI',
    tag: 'Best Selling',
    rating: 5.0,
    ratingCount: 1,
    category: 'Main Course',
    subcategory: 'Kacchi Bereani',
    price: 180.00,
    oldPrice: 225.00,
    description: 'Authentic aromatic kacchi biryani cooked with marinated tender mutton, fragrant basmati rice, golden potatoes, and shahi spices.',
    ingredients: ['Tender Mutton', 'Aromatic Basmati Rice', 'Shahi Garam Masala', 'Golden Saffron', 'Crisp Beresta'],
    image: kacchiBiryaniPng,
    isPng: true,
    is_published: true,
    status: 'published',
    themeColor: '#EA580C',
    ambientGlow: 'rgba(234, 88, 12, 0.45)',
    gradient: 'from-orange-500/25 via-amber-600/15 to-transparent',
    customizable: {
      portions: [
        { name: 'Half', extra: 0, price: 180, oldPrice: 225 },
        { name: 'Full', extra: 170, price: 350, oldPrice: 395 }
      ],
      addons: [
        { id: 'addon_1793820167546_0', name: 'Bhorhani (01) Littre', price: 150 },
        { id: 'addon_1793820167546_1', name: 'Bhorhani (01) Glass', price: 40 },
        { id: 'addon_1793820167546_2', name: 'Extra Meet (01) Piece', price: 120 }
      ]
    }
  },
  {
    id: '1793636922659',
    title: 'Coffee',
    tag: 'Top Rated',
    rating: 5.0,
    ratingCount: 1,
    category: 'Drinks',
    subcategory: 'Coffee',
    price: 150.00,
    oldPrice: null,
    description: 'Freshly extracted espresso made with roasted artisan beans and velvety micro-foamed milk.',
    ingredients: ['Artisan Roasted Beans', 'Fresh Steamed Milk', 'Pure Arabica Blend'],
    image: coffeePng,
    isPng: true,
    is_published: true,
    status: 'published',
    themeColor: '#854D0E',
    ambientGlow: 'rgba(133, 77, 14, 0.45)',
    gradient: 'from-amber-700/25 via-yellow-800/15 to-transparent',
    customizable: {
      portions: [
        { name: '120 ML Regular', extra: 0, price: 150 },
        { name: '200 ML With Extra Cream', extra: 26, price: 176, oldPrice: 220 }
      ],
      addons: [
        { id: 'addon_1793642612681_0', name: 'Extra Milk 10 ml ', price: 30 },
        { id: 'addon_1793642612681_1', name: 'Extra Sugar Packet', price: 20 }
      ]
    }
  }
];

export const initialCategories = ['Main Course', 'Appetizers', 'Beverages', 'Dessert', 'Drinks'];
