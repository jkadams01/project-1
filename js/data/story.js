/* Story event scripts. Each is function (done, ctx). */
(function () {
  var S = PKM.State, D = PKM.Dialog, E = PKM.Events, U = PKM.U;

  var TRIOS = [
    [1, 4, 7], [152, 155, 158], [252, 255, 258], [387, 390, 393], [495, 498, 501],
    [650, 653, 656], [722, 725, 728], [810, 813, 816], [906, 909, 912]
  ];
  function rivalCounter(starterId) {
    for (var i = 0; i < TRIOS.length; i++) {
      var t = TRIOS[i].indexOf(starterId);
      if (t >= 0) return TRIOS[i][(t + 1) % 3];
    }
    return 390;
  }
  function starterMid(starterId) { // first-stage evolution of a starter
    var edges = PKM.DATA.evolutions.edges[String(starterId)];
    return edges && edges.length ? edges[0].to : starterId;
  }
  function starterFinal(starterId) {
    var mid = starterMid(starterId);
    var edges = PKM.DATA.evolutions.edges[String(mid)];
    return edges && edges.length ? edges[0].to : mid;
  }
  PKM.StoryUtil = { rivalCounter: rivalCounter, starterMid: starterMid, starterFinal: starterFinal };

  PKM.registerScripts({
    /* ------------------------------ early game ------------------------------ */
    wake_up: function (done) {
      D.say(['({PLAYER} wakes up in a patch of morning sun.)',
        'There was a TV special last night about a red Gyarados in a faraway lake... and now {RIVAL} won\'t stop texting about our own Lake Verity.',
        'Better head downstairs.'], done);
    },

    mom_chat: function (done) {
      if (!S.flag('got_starter')) {
        D.say(['MOM: Off to the lake with {RIVAL}? Stick to the path on Route 201, alright?',
          'MOM: And if you find a Pokemon of your own... be good to it.'], done);
      } else {
        S.healParty();
        PKM.Audio.sfx('heal');
        D.say(['MOM: Welcome home, sweetheart! Let me look at your Pokemon... There, all rested!',
          'MOM: Professor Rowan is famous, you know. Do what he asks and see the world a little.'], done);
      }
    },

    rival_stop: function (done) {
      S.setFlag('rival_stopped');
      var ow = PKM.Overworld;
      var barry = ow.npcById('barry');
      var fin = function () {
        if (barry) barry.gone = true;
        D.say('...And he\'s gone. The lake, then. It\'s west along Route 201.', done);
      };
      if (!barry) { fin(); return; }
      barry.requires = null;
      var px = Math.round(ow.player.x), py = Math.round(ow.player.y);
      function rep(c, n) { var s = ''; while (n-- > 0) s += c; return s; }
      var approach = rep('u', Math.max(0, 5 - py)) + rep('l', Math.max(0, 14 - (px + 1)));
      D.say('{RIVAL}: WAIT! {PLAYER}!', function () {
        E.moveNpc(barry, approach, function () {
          barry.dir = 'left';
          D.say(['{RIVAL}: I saw it on TV! A red Gyarados! If something that rare is real, our lake HAS to have something in it too!',
            '{RIVAL}: Lake Verity! First one there owes the other a million bucks - GO!'], function () {
            var bx = px + 1;
            var exit = (bx < 11 ? rep('r', 11 - bx) : rep('l', bx - 11)) + rep('u', py);
            E.moveNpc(barry, exit + 'u', fin);
          });
        });
      });
    },

    lake_intro: function (done) {
      var ow = PKM.Overworld;
      if (S.flag('picked_starter')) { afterStarter(done); return; }
      D.say(['{RIVAL}: Took you long enough! Okay... the lake. Something rare is HERE, I know it.',
        'Across the water, a stern voice: "...no further data today. We\'re leaving." An older gentleman and his assistant hurry off up the trail.',
        '{RIVAL}: Hey, they forgot a briefcase! ...Should we? We should.',
        'The grass behind you rustles violently - wild STARLY, and they look mad!',
        '{RIVAL}: No Pokemon of our own and no way out... wait, the briefcase! It\'s full of Poke Balls!'], function () {
        PKM.Title.pickStarter(function (starterId) {
          PKM.G.starterId = starterId;
          S.setFlag('picked_starter');
          var mon = PKM.Mon.make(starterId, 5, { ot: PKM.G.name, shiny: false, ivs: [25, 25, 25, 25, 25, 25] });
          S.givePokemon(mon);
          PKM.Audio.sfx('catch');
          D.say(['{PLAYER} chose ' + PKM.species(starterId).name + '!', 'The STARLY dives at you!'], function () {
            PKM.Battle.start({
              kind: 'wild', enemy: PKM.Mon.make(396, 3, { moves: [33, 45] }), env: ow.battleEnv(),
              onEnd: function () { afterStarter(done); }
            });
          });
        });
      });

      function afterStarter(done2) {
        var starterId = PKM.G.starterId;
        PKM.DATA.trainers['rival1'] = {
          name: PKM.G.rivalName, class: 'Rival', music: 'leader', ai: 'good', money: 60,
          mons: [{ id: rivalCounter(starterId), level: 5 }],
          loseText: 'WHAT?! That\'s not how that was supposed to go!'
        };
        D.say(['{RIVAL}: That was AWESOME. ...Hey. These two basically chose us, right?',
          '{RIVAL}: Then there\'s only one thing left to do - see whose partner is stronger! GO!'], function () {
          PKM.Battle.start({
            kind: 'trainer', trainerId: 'rival1', env: ow.battleEnv(),
            onEnd: function () {
              S.healParty();
              D.say(['{RIVAL}: Hah... haah... okay. We keep these. Agreed? Agreed.',
                '{RIVAL}: That old guy had to be PROFESSOR ROWAN - the Pokemon Professor! His lab\'s in Sandgem Town. We should own up about the briefcase.',
                '(Your Pokemon shook itself off and looks ready for anything. Its HP was restored.)'], function () {
                S.setFlag('got_starter');
                done2();
              });
            }
          });
        });
      }
    },

    rowan_lab: function (done) {
      if (!S.flag('got_starter')) { D.say('AIDE: The Professor is doing fieldwork by the lakes. Come back later!', done); return; }
      if (!S.flag('has_dex')) {
        D.say(['ROWAN: Hm. The briefcase borrowers. I wondered when you\'d turn up.',
          'ROWAN: Don\'t apologize - show me the Pokemon. ...Well cared for already. You have the makings of a real Trainer.',
          'ROWAN: Listen. Pokemon from all nine known regions - Kanto out to Paldea - now make their homes across Sinnoh. Why? How? I intend to find out, and I am old.',
          'ROWAN: So you will do the legwork. Take this POKEDEX. It records every species you meet - all 1,025 of them, if you have the patience.',
          'ROWAN: One more thing. The Gym circuit will take you everywhere worth going. Start with Roark in Oreburgh, east of Jubilife City.'], function () {
          S.setFlag('has_dex');
          E.giveItem('poke-ball', 10, function () {
            E.giveItem('potion', 5, function () {
              D.say(['ROWAN: My aide refitted your shoes while we talked. Hold X to run - the soles are quite springy.',
                'ROWAN: Oh - and obstacles in the field. Fallen trees, boulders, rough water. The old way was to make a Pokemon memorize a chore-move for each one. Barbaric.',
                'ROWAN: These days the right TOOL and the right BADGE will see you through anything. Collect both as you travel. Now go. Jubilife is north, up Route 202.'], function () {
                S.setFlag('lab_done');
                done();
              });
            });
          });
        });
      } else {
        var c = S.dexCounts();
        D.say('ROWAN: Your Pokedex stands at ' + c.caught + ' caught. ' +
          (c.caught >= 1025 ? 'Astonishing. You have outdone every researcher alive.' : 'Every entry matters. Keep at it.'), done);
      }
    },

    /* ------------------------------ services ------------------------------ */
    nurse_heal: function (done) {
      D.ask('center_welcome', ['Yes please', 'No thanks'], function (i) {
        if (i === 0) {
          PKM.Audio.sfx('heal');
          S.healParty();
          var ow = PKM.Overworld;
          var hs = PKM.MAPS[ow.mapId].healSpot || { x: ow.player.x, y: ow.player.y };
          PKM.G.lastHeal = { map: ow.mapId, x: hs.x, y: hs.y };
          PKM.Save.save();
          D.say(['center_done', '(Your progress was saved.)'], done);
        } else done();
      });
    },

    use_pc: function (done) {
      D.say('Booting up the Pokemon Storage System...', function () {
        PKM.PC.open();
        done();
      });
    },

    shop_here: function (done) {
      var stock = PKM.MAPS[PKM.Overworld.mapId].shop || ['poke-ball', 'potion'];
      D.say('mart_welcome', function () {
        PKM.Shop.open(stock);
        done();
      });
    },

    /* --------------------------- gym leaders ---------------------------- */
    /* GYMS table: gym map id -> {leader trainerId, badge index, reward key items,
       badge display name, victory speech}. The mandatory path never requires a
       field move before its badge is earnable, so the game is HM-free-completable. */
    move_reminder: function (done) {
      var party = PKM.G.party;
      D.ask('Heya! I can help a Pokemon REMEMBER any move from its level-up list. Free of charge - I just love the look on their faces. Who needs me?',
        party.map(function (m) { return PKM.Mon.name(m) + ' Lv' + m.level; }), function (i) {
          if (i < 0) { done(); return; }
          var mon = party[i];
          var known = {};
          mon.moves.forEach(function (ms) { known[ms.id] = 1; });
          var avail = PKM.learnset(mon.pokeId).filter(function (p) { return p[0] <= mon.level && !known[p[1]]; });
          var seen = {}; avail = avail.filter(function (p) { if (seen[p[1]]) return false; seen[p[1]] = 1; return true; });
          if (!avail.length) { D.say('Hmm, ' + PKM.Mon.name(mon) + ' already knows everything for its level!', done); return; }
          var opts = avail.slice(-8).map(function (p) { return PKM.move(p[1]).name + ' (Lv' + p[0] + ')'; });
          var ids = avail.slice(-8).map(function (p) { return p[1]; });
          D.ask('Which move should it remember?', opts, function (j) {
            if (j < 0) { done(); return; }
            var mv = PKM.move(ids[j]);
            if (PKM.Mon.teach(mon, ids[j])) { D.say(PKM.Mon.name(mon) + ' remembered ' + mv.name + '!', done); }
            else {
              D.ask('Forget which move for ' + mv.name + '?', mon.moves.map(function (ms) { return PKM.move(ms.id).name; }).concat(['Never mind']), function (k) {
                if (k >= 0 && k < 4) { mon.moves[k] = { id: ids[j], pp: mv.pp, max: mv.pp }; D.say('And... done! ' + PKM.Mon.name(mon) + ' remembered ' + mv.name + '!', done); }
                else done();
              }, { cancel: false });
            }
          });
        });
    }
  });

  /* ===================== gyms, Galactic arc, league ===================== */
  var GYMS = {
    oreburgh_gym:  { leader: 'roark',    badge: 0, rewards: ['miners-hammer'],                    name: 'Coal',   field: 'Rock Smash' },
    eterna_gym:    { leader: 'gardenia', badge: 1, rewards: ['hatchet'],                          name: 'Forest', field: 'Cut' },
    hearthome_gym: { leader: 'fantina',  badge: 2, rewards: ['power-gauntlets', 'sky-shuttle-pass'], name: 'Relic', field: 'Strength & the Sky Shuttle' },
    veilstone_gym: { leader: 'maylene',  badge: 3, rewards: [],                                   name: 'Cobble', field: null },
    pastoria_gym:  { leader: 'wake',     badge: 4, rewards: ['wavewalker-charm'],                 name: 'Fen',    field: 'Surf' },
    canalave_gym:  { leader: 'byron',    badge: 5, rewards: [],                                   name: 'Mine',   field: null },
    snowpoint_gym: { leader: 'candice',  badge: 6, rewards: ['climbing-gear'],                    name: 'Icicle', field: 'Rock Climb' },
    sunyshore_gym: { leader: 'volkner',  badge: 7, rewards: ['cascade-charm'],                    name: 'Beacon', field: 'Waterfall' }
  };

  function giveRewards(items, done) {
    var i = 0;
    (function next() {
      if (i >= items.length) { done(); return; }
      E.giveItem(items[i++], 1, next);
    })();
  }

  var gymScripts = {};
  Object.keys(GYMS).forEach(function (mapId) {
    var g = GYMS[mapId];
    gymScripts['gym_' + mapId.replace('_gym', '')] = function (done, ctx) {
      var npc = ctx.npc;
      if (PKM.G.badges[g.badge]) { D.say('The Gym Leader nods. "That badge looks good on you, Champion-to-be."', done); return; }
      PKM.Battle.start({
        kind: 'trainer', trainerId: g.leader, env: PKM.Overworld.battleEnv(),
        onWin: function () {
          PKM.State.setFlag('tr_' + g.leader);
          PKM.G.badges[g.badge] = true;
          PKM.Audio.sfx('badge');
          D.say('{PLAYER} received the ' + g.name + ' Badge!', function () {
            if (!g.rewards.length) { D.say('The path ahead is open. On to the next challenge!', done); return; }
            D.say('"And take these - you\'ve more than earned them."', function () {
              giveRewards(g.rewards, function () {
                var msg = g.field
                  ? 'With the ' + g.name + ' Badge and the right gear, you can now use ' + g.field + ' out in the field - no need to teach your Pokemon a single chore-move!'
                  : 'Your Pokemon look stronger already.';
                D.say(msg, done);
              });
            });
          });
        },
        onLose: function () { done(); },
        onEnd: function (r) { if (r !== 'win') done(); }
      });
    };
  });
  PKM.registerScripts(gymScripts);

  PKM.registerScripts({
    /* ----------------------------- Galactic ----------------------------- */
    galactic_hq_boss: function (done, ctx) {
      if (PKM.State.flag('tr_saturn1')) { D.say('The lab is silent now. Whatever they were building here, it\'s finished - or abandoned.', done); return; }
      D.say(['A Galactic Commander blocks the vault.',
        'Saturn: The Lake spirits, the Red Chain... none of it concerns a child. Turn around.'], function () {
        PKM.Battle.start({
          kind: 'trainer', trainerId: 'saturn1', env: PKM.Overworld.battleEnv(),
          onWin: function () {
            PKM.State.setFlag('tr_saturn1');
            PKM.State.setFlag('galactic_hq_cleared');
            E.giveItem('works-key', 1, function () {
              D.say(['Saturn: ...Fine. You\'ve seen the machine. It hardly matters.',
                'Saturn: Cyrus has already left for Mt. Coronet\'s peak - for Spear Pillar. Go ahead and follow. You\'ll only watch a new world be born.'], done);
            });
          },
          onEnd: function (r) { if (r !== 'win') done(); }
        });
      });
    },

    spear_pillar_event: function (done) {
      if (PKM.State.flag('spear_done')) { D.say('Wind howls across the empty pillars.', done); return; }
      D.say(['At the summit, Team Galactic\'s commanders bar the way.',
        'Mars: The boss is busy remaking reality. We\'ll keep you company until it\'s done!'], function () {
        PKM.Battle.start({
          kind: 'trainer', trainerId: 'mars2', env: PKM.Overworld.battleEnv(),
          onWin: function () {
            PKM.Battle.start({
              kind: 'trainer', trainerId: 'jupiter2', env: PKM.Overworld.battleEnv(),
              onWin: function () {
                D.say(['Cyrus: Noise. All of you. But it ends now - the Red Chain is complete.',
                  'Cyrus: Dialga, Palkia - chained to my will. Behold the unmaking of a flawed world!',
                  'A tear opens in the sky. Something vast and serpentine pours through it -',
                  'GIRATINA, the Renegade, drags Cyrus into its own broken dimension... and you are pulled in after.'], function () {
                  PKM.State.setFlag('spear_done');
                  done();
                });
              },
              onEnd: function (r) { if (r !== 'win') done(); }
            });
          },
          onEnd: function (r) { if (r !== 'win') done(); }
        });
      });
    },

    distortion_finale: function (done) {
      if (PKM.State.flag('distortion_done')) { D.say('Gravity wanders. The Distortion World remembers everything that happened here.', done); return; }
      D.say(['Cyrus stands on a floating shard, the Red Chain dim in his hand.',
        'Cyrus: This world has no spirit to trouble it. It is perfect. And you will not leave it.'], function () {
        PKM.Battle.start({
          kind: 'trainer', trainerId: 'cyrus2', env: PKM.Overworld.battleEnv(),
          onWin: function () {
            PKM.State.setFlag('tr_cyrus2');
            D.say(['Cyrus: ...The spirit you fight with. The bonds. I cannot account for them. I never could.',
              'He turns away into the haze, and is gone.',
              'GIRATINA descends - furious, curious. This is your one chance!'], function () {
              PKM.State.markSeen(487);
              PKM.Battle.start({
                kind: 'wild', enemy: PKM.Mon.make(487, 47), env: { theme: 'distortion', cave: true },
                onEnd: function () {
                  PKM.State.setFlag('distortion_done');
                  PKM.State.setFlag('galactic_defeated');
                  D.say(['The Distortion World folds quietly back toward Mt. Coronet.',
                    'Whether you caught Giratina or not, Sinnoh is whole again - and the road to the Pokemon League is finally clear.'], done);
                }
              });
            });
          },
          onEnd: function (r) { if (r !== 'win') done(); }
        });
      });
    },

    /* ------------------------------ league ------------------------------ */
    league_gate: function (done) {
      var n = PKM.State.badgeCount();
      if (n >= 8) { D.say('Guard: All eight badges. The Elite Four are expecting you - go on through.', done); }
      else D.say('Guard: The Pokemon League admits only Trainers with all eight Gym Badges. You have ' + n + '. Come back when you\'ve collected them all!', done);
    },

    elite_four_run: function (done) {
      if (PKM.State.flag('league_champion')) { D.say('Cynthia: Back already? The title\'s still yours. Care for a rematch some day?', done); return; }
      if (PKM.State.badgeCount() < 8) { D.say('You need all eight badges to challenge the Elite Four.', done); return; }
      var order = [
        ['aaron', 'Aaron of the Bug-types steps forward.'],
        ['bertha', 'Bertha, the Ground-type elder, smiles kindly.'],
        ['flint', 'Flint blazes in, Fire-types at the ready.'],
        ['lucian', 'Lucian sets down his book and adjusts his glasses.'],
        ['cynthia', 'And finally - Champion Cynthia.']
      ];
      var i = 0;
      function nextBattle() {
        if (i >= order.length) {
          PKM.State.setFlag('league_champion');
          PKM.Credits.run(done);
          return;
        }
        var pair = order[i++];
        D.say(pair[1], function () {
          PKM.State.healParty(); // each E4 room heals you between bouts
          PKM.Battle.start({
            kind: 'trainer', trainerId: pair[0], env: { theme: 'league' },
            onWin: function () { PKM.State.setFlag('tr_' + pair[0]); nextBattle(); },
            onEnd: function (r) { if (r !== 'win') done(); }
          });
        });
      }
      D.say(['You step into the first hall of the Pokemon League.',
        'Five battles, no breaks but a quick heal between each. This is everything you\'ve trained for.'], nextBattle);
    },

    /* lake legendary statics (post-Champion roaming trio, simplified to statics) */
    mesprit_event: function (done) { staticLegend(488 === 0 ? 481 : 481, 50, 'A burst of emotion ripples off the lake - MESPRIT!', done); },
    azelf_event: function (done) { staticLegend(482, 50, 'Willpower radiates from the cavern - AZELF!', done); },
    uxie_event: function (done) { staticLegend(480, 50, 'Ancient knowledge stirs - UXIE!', done); }
  });

  function staticLegend(id, lvl, intro, done) {
    PKM.State.markSeen(id);
    D.say(intro, function () {
      PKM.Battle.start({ kind: 'wild', enemy: PKM.Mon.make(id, lvl), env: PKM.Overworld.battleEnv(), onEnd: function () { done(); } });
    });
  }

  /* hall-of-legends pedestals: one static encounter per legendary, generated to
     match the gen_encounters hall_static ordering. */
  var hallScripts = {};
  var hall = (PKM.DATA.encounters && PKM.DATA.encounters.hall_static) || [];
  hall.forEach(function (row, idx) {
    hallScripts['hall_pedestal_' + idx] = function (done) {
      var id = row[0], lvl = row[1] || 60, sp = PKM.species(id);
      if (PKM.G.dex.caught[id]) { D.say('The pedestal is quiet. ' + sp.name + ' already answered your call.', done); return; }
      PKM.State.markSeen(id);
      D.say('The pedestal blazes with light - ' + sp.name + ' takes form!', function () {
        PKM.Battle.start({ kind: 'wild', enemy: PKM.Mon.make(id, lvl), env: { theme: 'league', cave: true }, onEnd: function () { done(); } });
      });
    };
  });
  PKM.registerScripts(hallScripts);
})();
