PKM.registerMap('veilstone_mart', {
 "name": "Veilstone Poke Mart",
 "theme": "mart",
 "music": "center",
 "indoor": true,
 "tiles": [
  "##############",
  "#..##....##..#",
  "#............#",
  "#..##....##..#",
  "#............#",
  "#............#",
  "#............#",
  "#............#",
  "######D#######"
 ],
 "shop": [
  "poke-ball",
  "great-ball",
  "potion",
  "super-potion",
  "antidote",
  "paralyze-heal",
  "awakening",
  "burn-heal",
  "ice-heal",
  "full-heal",
  "repel",
  "super-repel",
  "escape-rope",
  "revive",
  "dusk-ball",
  "quick-ball",
  "hyper-potion"
 ],
 "warps": [
  {
   "x": 6,
   "y": 8,
   "to": "veilstone",
   "tx": 18,
   "ty": 5,
   "dir": "down"
  }
 ],
 "signs": [],
 "npcs": [
  {
   "id": "clerk",
   "x": 2,
   "y": 6,
   "sprite": "clerk",
   "dir": "right",
   "move": "static",
   "script": "shop_here"
  }
 ]
});
