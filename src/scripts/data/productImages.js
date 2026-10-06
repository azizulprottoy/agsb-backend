// Starter photos for the shop catalog, keyed by slug. All are from Wikimedia
// Commons (file name and licence noted per URL); CC BY / CC BY-SA files need
// credit if the frontend ever shows image credits. Replace them with real
// product shots from the admin panel when available.
const PRODUCT_IMAGES = {
  '2-person-dome-tent': [
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e1/Dome_tent_in_the_BWCA_%28CDM11452CT%29.jpg/960px-Dome_tent_in_the_BWCA_%28CDM11452CT%29.jpg', // Dome tent in the BWCA (CDM11452CT).jpg (CC BY-SA 4.0)
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e0/August_2009%2C_Tent_in_Daisetsuzan.jpg/960px-August_2009%2C_Tent_in_Daisetsuzan.jpg', // August 2009, Tent in Daisetsuzan.jpg (CC0)
  ],
  'sleeping-bag': [
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2e/Mummy_bag.jpg/960px-Mummy_bag.jpg', // Mummy bag.jpg (Public domain)
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/Compactsleepingbag_-_sleeping_bag_without_background.png/960px-Compactsleepingbag_-_sleeping_bag_without_background.png', // Compactsleepingbag - sleeping bag without background.png (Public domain)
  ],
  'headlamp': [
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bd/LED-headlamp.jpg/960px-LED-headlamp.jpg', // LED-headlamp.jpg (Public domain)
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/db/LED_headlamp_%281%29.jpg/960px-LED_headlamp_%281%29.jpg', // LED headlamp (1).jpg (CC BY-SA 3.0)
  ],
  '45l-trekking-backpack': [
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/Plecak_Hiker_50_L_HiMountain.jpg/960px-Plecak_Hiker_50_L_HiMountain.jpg', // Plecak Hiker 50 L HiMountain.jpg (CC0)
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a3/A_backpack_with_trekking_poles_and_shoes.jpg/960px-A_backpack_with_trekking_poles_and_shoes.jpg', // A backpack with trekking poles and shoes.jpg (CC BY-SA 4.0)
  ],
  'dry-bag-20l': [
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/Drybag.png/960px-Drybag.png', // Drybag.png (CC BY-SA 4.0)
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f2/Drybag_in_a_canoe.jpg/960px-Drybag_in_a_canoe.jpg', // Drybag in a canoe.jpg (CC BY-SA 4.0)
  ],
  'life-jacket': [
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f6/K%C3%BChlungsborn%2C_Marina%2C_Rettungswesten_--_2024_--_5222.jpg/960px-K%C3%BChlungsborn%2C_Marina%2C_Rettungswesten_--_2024_--_5222.jpg', // Kühlungsborn, Marina, Rettungswesten -- 2024 -- 5222.jpg (CC BY-SA 4.0)
    'https://upload.wikimedia.org/wikipedia/commons/f/f4/Life_jacket_store_-_geograph.org.uk_-_802466.jpg', // Life jacket store - geograph.org.uk - 802466.jpg (CC BY-SA 2.0)
  ],
  'hooded-raincoat': [
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/Early_Gore-Tex_hooded_rain_jacket.jpg/960px-Early_Gore-Tex_hooded_rain_jacket.jpg', // Early Gore-Tex hooded rain jacket.jpg (CC BY-SA 4.0)
  ],
  'pop-up-mosquito-net': [
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/62/Mosquito_Net_%285855064364%29.jpg/960px-Mosquito_Net_%285855064364%29.jpg', // Mosquito Net (5855064364).jpg (CC BY-SA 2.0)
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f2/Yong_Farmstay_mosquito_net_bed.jpg/960px-Yong_Farmstay_mosquito_net_bed.jpg', // Yong Farmstay mosquito net bed.jpg (CC BY-SA 4.0)
  ],
  'camping-hammock-bug-net': [
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7f/Camping_hammock.jpg/960px-Camping_hammock.jpg', // Camping hammock.jpg (CC BY-SA 4.0)
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/95/Dutch_in_a_Quilted_Chameleon_Hammock.jpg/960px-Dutch_in_a_Quilted_Chameleon_Hammock.jpg', // Dutch in a Quilted Chameleon Hammock.jpg (CC BY-SA 4.0)
  ],
  'anti-leech-socks': [
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/37/Tourist_Gaiters.jpg/960px-Tourist_Gaiters.jpg', // Tourist Gaiters.jpg (CC BY-SA 3.0)
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e0/Short_hiking_gaiters.JPG/960px-Short_hiking_gaiters.JPG', // Short hiking gaiters.JPG (CC BY-SA 4.0)
  ],
  'trekking-sandals': [
    'https://upload.wikimedia.org/wikipedia/commons/8/80/Hiking_and_Trekking_Sandals.jpg', // Hiking and Trekking Sandals.jpg (CC BY-SA 3.0)
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Hiking_sandals_of_Hysocc.jpg/960px-Hiking_sandals_of_Hysocc.jpg', // Hiking sandals of Hysocc.jpg (CC BY-SA 3.0)
  ],
  'binoculars-10x25': [
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1a/Leitz_Trinovid_8x20_compact_binoculars_1.jpg/960px-Leitz_Trinovid_8x20_compact_binoculars_1.jpg', // Leitz Trinovid 8x20 compact binoculars 1.jpg (CC BY 2.0)
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/2020_Lornetka_Baigish_8x30.jpg/960px-2020_Lornetka_Baigish_8x30.jpg', // 2020 Lornetka Baigish 8x30.jpg (CC BY-SA 4.0)
  ],
  'power-bank-20000': [
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/91/Power_Bank.jpg/960px-Power_Bank.jpg', // Power Bank.jpg (CC BY-SA 4.0)
    'https://upload.wikimedia.org/wikipedia/commons/7/79/Oraimo_power_bank.jpg', // Oraimo power bank.jpg (CC BY-SA 4.0)
  ],
};

const CATEGORY_IMAGES = {
  'camping': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Zagedan_Ridge%2C_Camping_tent%2C_Caucasus_Mountains.jpg/960px-Zagedan_Ridge%2C_Camping_tent%2C_Caucasus_Mountains.jpg', // Zagedan Ridge, Camping tent, Caucasus Mountains.jpg (CC BY 4.0)
  'bags': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/Backpack_small.jpg/960px-Backpack_small.jpg', // Backpack small.jpg (CC BY-SA 4.0)
  'rain-water': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b4/Poncho_in_post-rain_sunshine_%2814556518687%29.jpg/960px-Poncho_in_post-rain_sunshine_%2814556518687%29.jpg', // Poncho in post-rain sunshine (14556518687).jpg (CC BY-SA 2.0)
  'electronics': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/53/Charging_a_smartphone_with_a_USB_power_bank.jpg/960px-Charging_a_smartphone_with_a_USB_power_bank.jpg', // Charging a smartphone with a USB power bank.jpg (CC BY-SA 4.0)
};

module.exports = { PRODUCT_IMAGES, CATEGORY_IMAGES };
