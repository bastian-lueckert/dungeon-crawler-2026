import type { Character, ChestSpawn, ClassId, DungeonLevel, Party } from './core/types';
import { CLASSES, CLASS_LIST } from './data/classes';
import { CAMPAIGNS, getCampaignById, getNextCampaign } from './data/campaigns';
import { MONSTERS } from './data/monsters';
import { SPELLS } from './data/spells';
import { getClassPortrait, getMonsterPortrait } from './data/portraits';
import { ITEMS } from './data/items';
import { Rng } from './core/rng';
import { autoEquipIfBetter, createCharacter, equipItem, grantXp, recomputeArmorClass, rollAbilities } from './core/character';
import { generateDungeonLevel } from './core/dungeonGenerator';
import { discoverAround, renderMinimap, renderViewport, canMove, movePosition, turnLeft, turnRight } from './render/viewport';
import { Encounter, hasHealingPotion, type LastAction } from './core/encounter';
import { applyDamageToCharacter, healCharacter, reviveCharacter } from './core/combat';
import { deleteSave, listSaveSlots, loadGame, saveGame, saveMeta } from './core/save';

type Screen = 'title' | 'roster' | 'campaignSelect' | 'game' | 'loadGame' | 'inventory';
type CombatMode = 'menu' | 'spellMenu' | 'targetAttack' | 'targetSpellDamage' | 'targetSpellHeal';

interface PendingCharacter {
  name: string;
  classId: ClassId;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class App {
  private root: HTMLElement;
  private screen: Screen = 'title';

  private pendingRoster: PendingCharacter[] = [];
  private party: Party | null = null;
  private level: DungeonLevel | null = null;
  private encounter: Encounter | null = null;
  private rng = new Rng(Date.now());
  private activeSaveSlot = 0;

  private mainCanvas?: HTMLCanvasElement;
  private minimapCanvas?: HTMLCanvasElement;

  private combatMode: CombatMode = 'menu';
  private pendingSpellId: string | null = null;
  private combatBusy = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.renderScreen();
    requestAnimationFrame(this.animationLoop);
  }

  private animationLoop = () => {
    if (this.screen === 'game' && !this.encounter) this.draw();
    requestAnimationFrame(this.animationLoop);
  };

  private renderScreen() {
    this.root.innerHTML = '';
    if (this.screen === 'title') this.renderTitle();
    else if (this.screen === 'roster') this.renderRosterBuilder();
    else if (this.screen === 'campaignSelect') this.renderCampaignSelect();
    else if (this.screen === 'loadGame') this.renderLoadGame();
    else if (this.screen === 'game') this.renderGame();
    else if (this.screen === 'inventory') this.renderInventory();
  }

  private portraitEl(svg: string, extraClass = ''): HTMLDivElement {
    const div = document.createElement('div');
    div.className = `portrait ${extraClass}`.trim();
    div.innerHTML = svg;
    return div;
  }

  // ---------------- TITLE ----------------

  private renderTitle() {
    const el = document.createElement('div');
    el.className = 'screen centered title-screen';
    el.innerHTML = `
      <h1>Dungeon Crawler 2026</h1>
      <div class="subtitle">Ein Abenteuer im Geiste alter Dungeon-Crawler-Legenden</div>
      <div class="menu-list">
        <button id="btn-new">Neues Abenteuer</button>
        <button id="btn-load">Spiel laden</button>
      </div>
    `;
    this.root.appendChild(el);
    el.querySelector('#btn-new')!.addEventListener('click', () => {
      this.pendingRoster = [];
      this.screen = 'roster';
      this.renderScreen();
    });
    el.querySelector('#btn-load')!.addEventListener('click', () => {
      this.screen = 'loadGame';
      this.renderScreen();
    });
  }

  // ---------------- LOAD GAME ----------------

  private renderLoadGame() {
    const el = document.createElement('div');
    el.className = 'screen centered';
    const slots = listSaveSlots();
    el.innerHTML = `<h2>Spiel laden</h2>`;
    const list = document.createElement('div');
    list.className = 'menu-list';
    if (slots.length === 0) {
      list.innerHTML = `<div class="card">Keine Spielstände gefunden.</div>`;
    }
    for (const slot of slots) {
      const meta = saveMeta(slot);
      if (!meta) continue;
      const campaign = getCampaignById(meta.campaignId);
      const row = document.createElement('div');
      row.className = 'card';
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.gap = '0.5rem';
      row.innerHTML = `
        <div>
          <strong>Slot ${slot}</strong> — ${meta.partyNames.join(', ')}<br/>
          <span style="color:var(--text-dim); font-size:0.8rem">${campaign?.name ?? meta.campaignId} · ${new Date(meta.savedAt).toLocaleString()}</span>
        </div>
      `;
      const btnRow = document.createElement('div');
      const loadBtn = document.createElement('button');
      loadBtn.textContent = 'Laden';
      loadBtn.addEventListener('click', () => this.loadFromSlot(slot));
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Löschen';
      delBtn.addEventListener('click', () => {
        deleteSave(slot);
        this.renderScreen();
      });
      btnRow.append(loadBtn, delBtn);
      row.appendChild(btnRow);
      list.appendChild(row);
    }
    const back = document.createElement('button');
    back.textContent = 'Zurück';
    back.addEventListener('click', () => {
      this.screen = 'title';
      this.renderScreen();
    });
    el.append(list, back);
    this.root.appendChild(el);
  }

  private loadFromSlot(slot: number) {
    const save = loadGame(slot);
    if (!save) return;
    this.activeSaveSlot = slot;
    this.party = save.party;
    this.startLevel(save.party.campaignId, save.party.levelIndex, save.dungeonSeed);
  }

  // ---------------- ROSTER BUILDER ----------------

  private renderRosterBuilder() {
    const el = document.createElement('div');
    el.className = 'screen';
    el.innerHTML = `<h2>Gruppe erstellen</h2><p style="color:var(--text-dim)">Erstelle bis zu 4 Charaktere für dein Abenteuer.</p>`;

    const grid = document.createElement('div');
    grid.className = 'roster-grid';
    this.pendingRoster.forEach((pc, i) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.display = 'flex';
      card.style.gap = '0.6rem';
      card.style.alignItems = 'center';
      const info = document.createElement('div');
      info.innerHTML = `<strong>${pc.name}</strong><br/><span style="color:var(--gold)">${CLASSES[pc.classId].name}</span><br/>`;
      const rm = document.createElement('button');
      rm.textContent = 'Entfernen';
      rm.style.marginTop = '0.3rem';
      rm.addEventListener('click', () => {
        this.pendingRoster.splice(i, 1);
        this.renderScreen();
      });
      info.appendChild(rm);
      card.appendChild(this.portraitEl(getClassPortrait(pc.classId), 'large'));
      card.appendChild(info);
      grid.appendChild(card);
    });
    el.appendChild(grid);

    if (this.pendingRoster.length < 4) {
      const form = document.createElement('div');
      form.className = 'card';
      form.style.marginTop = '1rem';
      form.innerHTML = `
        <h3>Neuer Charakter</h3>
        <input id="char-name" placeholder="Name" maxlength="20" />
        <div class="class-picker" id="class-picker" style="margin-top:0.5rem"></div>
      `;
      const picker = form.querySelector('#class-picker')!;
      let selectedClass: ClassId = 'warrior';
      for (const c of CLASS_LIST) {
        const b = document.createElement('button');
        b.textContent = c.name;
        b.title = c.description;
        if (c.id === selectedClass) b.classList.add('selected');
        b.addEventListener('click', () => {
          selectedClass = c.id;
          picker.querySelectorAll('button').forEach((x) => x.classList.remove('selected'));
          b.classList.add('selected');
        });
        picker.appendChild(b);
      }
      const addBtn = document.createElement('button');
      addBtn.textContent = 'Charakter hinzufügen';
      addBtn.style.marginTop = '0.6rem';
      addBtn.addEventListener('click', () => {
        const input = form.querySelector('#char-name') as HTMLInputElement;
        const name = input.value.trim() || `Held ${this.pendingRoster.length + 1}`;
        this.pendingRoster.push({ name, classId: selectedClass });
        this.renderScreen();
      });
      form.appendChild(document.createElement('br'));
      form.appendChild(addBtn);
      el.appendChild(form);
    }

    const nav = document.createElement('div');
    nav.style.marginTop = '1rem';
    nav.style.display = 'flex';
    nav.style.gap = '0.5rem';
    const back = document.createElement('button');
    back.textContent = 'Zurück';
    back.addEventListener('click', () => {
      this.screen = 'title';
      this.renderScreen();
    });
    const next = document.createElement('button');
    next.textContent = 'Weiter zur Kampagnenwahl';
    next.disabled = this.pendingRoster.length === 0;
    next.addEventListener('click', () => {
      this.screen = 'campaignSelect';
      this.renderScreen();
    });
    nav.append(back, next);
    el.appendChild(nav);
    this.root.appendChild(el);
  }

  // ---------------- CAMPAIGN SELECT ----------------

  private renderCampaignSelect() {
    const el = document.createElement('div');
    el.className = 'screen';
    el.innerHTML = `<h2>Kampagne wählen</h2>`;
    const grid = document.createElement('div');
    grid.className = 'roster-grid';
    for (const c of CAMPAIGNS) {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.borderLeft = `4px solid ${c.themeColor}`;
      card.innerHTML = `
        <h3>${c.order}. ${c.name}</h3>
        <p style="color:var(--gold); margin:0.2em 0">${c.tagline}</p>
        <p style="color:var(--text-dim); font-size:0.9rem">${c.description}</p>
        <p style="font-size:0.8rem">Empfohlene Startstufe: ${c.minCharacterLevel} · ${c.levelCount} Ebenen</p>
      `;
      const start = document.createElement('button');
      start.textContent = 'Abenteuer beginnen';
      start.addEventListener('click', () => this.beginNewGame(c.id));
      card.appendChild(start);
      grid.appendChild(card);
    }
    el.appendChild(grid);
    const back = document.createElement('button');
    back.textContent = 'Zurück';
    back.style.marginTop = '1rem';
    back.addEventListener('click', () => {
      this.screen = 'roster';
      this.renderScreen();
    });
    el.appendChild(back);
    this.root.appendChild(el);
  }

  private beginNewGame(campaignId: string) {
    const rng = new Rng(Date.now());
    const members: Character[] = this.pendingRoster.map((pc) => createCharacter(pc.name, pc.classId, rollAbilities(rng), rng));
    this.party = {
      members,
      gold: 50,
      position: { x: 0, y: 0 },
      facing: 0,
      campaignId,
      levelIndex: 0,
    };
    const seed = `${campaignId}-0-${Date.now()}`;
    this.startLevel(campaignId, 0, seed);
  }

  // ---------------- GAME (Dungeon Crawl) ----------------

  private startLevel(campaignId: string, levelIndex: number, seed: string) {
    const campaign = getCampaignById(campaignId)!;
    this.level = generateDungeonLevel({ campaign, levelIndexInCampaign: levelIndex, seed });
    this.party!.campaignId = campaignId;
    this.party!.levelIndex = levelIndex;
    this.party!.position = { ...this.level.startPosition };
    this.party!.facing = 0;
    discoverAround(this.level, this.party!.position, 1);
    this.screen = 'game';
    this.renderScreen();
  }

  private renderGame() {
    if (!this.party || !this.level) return;
    const el = document.createElement('div');
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.height = '100%';
    el.style.position = 'relative';

    const topBar = document.createElement('div');
    topBar.className = 'top-bar';
    const campaign = getCampaignById(this.party.campaignId);
    topBar.innerHTML = `<span>${campaign?.name ?? ''} — Ebene ${this.party.levelIndex + 1}</span>`;
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Speichern';
    saveBtn.addEventListener('click', () => this.doSave());
    topBar.appendChild(saveBtn);
    el.appendChild(topBar);

    const layout = document.createElement('div');
    layout.className = 'game-layout';
    layout.style.flex = '1';
    layout.style.minHeight = '0';
    layout.style.padding = '0.5rem';

    const viewportWrap = document.createElement('div');
    viewportWrap.className = 'viewport-wrap';
    const mainCanvas = document.createElement('canvas');
    mainCanvas.className = 'main-viewport';
    mainCanvas.width = 800;
    mainCanvas.height = 500;
    const minimap = document.createElement('canvas');
    minimap.className = 'minimap-canvas';
    minimap.width = 150;
    minimap.height = 150;
    viewportWrap.append(mainCanvas, minimap);
    this.mainCanvas = mainCanvas;
    this.minimapCanvas = minimap;

    const bottomArea = document.createElement('div');
    bottomArea.style.display = 'flex';
    bottomArea.style.flexDirection = 'column';
    bottomArea.style.gap = '0.4rem';

    const partyHud = document.createElement('div');
    partyHud.className = 'party-hud';
    this.renderPartyHud(partyHud);

    const controlsBar = document.createElement('div');
    controlsBar.className = 'controls-bar';

    const dpad = document.createElement('div');
    dpad.className = 'dpad';
    dpad.innerHTML = `
      <span></span><button id="mv-fwd">▲</button><span></span>
      <button id="mv-left">◀</button><button id="mv-back">▼</button><button id="mv-right">▶</button>
    `;

    const turnPad = document.createElement('div');
    turnPad.className = 'turn-pad';
    turnPad.innerHTML = `<button id="turn-left">↺</button><button id="turn-right">↻</button>`;

    const restBtn = document.createElement('button');
    restBtn.textContent = 'Rasten';
    restBtn.addEventListener('click', () => this.rest());

    const inventoryBtn = document.createElement('button');
    inventoryBtn.textContent = '🎒 Inventar';
    inventoryBtn.addEventListener('click', () => {
      this.screen = 'inventory';
      this.renderScreen();
    });

    controlsBar.append(dpad, turnPad, document.createElement('span'), inventoryBtn, restBtn);

    const logPanel = document.createElement('div');
    logPanel.className = 'log-panel';
    logPanel.id = 'game-log';
    logPanel.textContent = 'Willkommen im Dungeon. Nutze die Pfeile, um dich zu bewegen.';

    bottomArea.append(partyHud, controlsBar, logPanel);

    layout.append(viewportWrap, bottomArea);
    el.appendChild(layout);
    this.root.appendChild(el);

    dpad.querySelector('#mv-fwd')!.addEventListener('click', () => this.tryMove('forward'));
    dpad.querySelector('#mv-back')!.addEventListener('click', () => this.tryMove('backward'));
    dpad.querySelector('#mv-left')!.addEventListener('click', () => this.tryMove('left'));
    dpad.querySelector('#mv-right')!.addEventListener('click', () => this.tryMove('right'));
    turnPad.querySelector('#turn-left')!.addEventListener('click', () => this.turn('left'));
    turnPad.querySelector('#turn-right')!.addEventListener('click', () => this.turn('right'));

    this.attachKeyboardControls();
    this.draw();
  }

  // ---------------- INVENTORY / EQUIPMENT ----------------

  private renderInventory() {
    if (!this.party) return;
    const el = document.createElement('div');
    el.className = 'screen';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.innerHTML = `<h2>Inventar & Ausrüstung</h2><span style="color:var(--gold)">${this.party.gold} Gold</span>`;
    el.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'roster-grid';

    for (const member of this.party.members) {
      grid.appendChild(this.buildInventoryCard(member));
    }
    el.appendChild(grid);

    const back = document.createElement('button');
    back.textContent = 'Zurück zum Dungeon';
    back.style.marginTop = '1rem';
    back.addEventListener('click', () => {
      this.screen = 'game';
      this.renderScreen();
    });
    el.appendChild(back);

    this.root.appendChild(el);
  }

  /** Entfernt einen Gegenstand aus der Ausrüstung, falls er nicht mehr im Inventar vorhanden ist (nach Verkauf/Weitergabe). */
  private unequipIfMissing(character: Character, itemId: string) {
    const stillHasItem = character.inventory.some((s) => s.itemId === itemId);
    if (stillHasItem) return;
    for (const slot of ['weapon', 'offhand', 'armor', 'accessory', 'head'] as const) {
      if (character.equipment[slot] === itemId) delete character.equipment[slot];
    }
    recomputeArmorClass(character);
  }

  private buildInventoryCard(member: Character): HTMLElement {
    const card = document.createElement('div');
    card.className = 'card';

    const headRow = document.createElement('div');
    headRow.style.display = 'flex';
    headRow.style.gap = '0.6rem';
    headRow.style.alignItems = 'center';
    headRow.appendChild(this.portraitEl(getClassPortrait(member.classId), member.isAlive ? '' : 'defending'));
    const headInfo = document.createElement('div');
    headInfo.innerHTML = `
      <strong>${member.name}</strong> (Lv ${member.level})<br/>
      <span style="color:var(--text-dim)">${CLASSES[member.classId].name}</span><br/>
      <span style="font-size:0.85rem">${member.isAlive ? `${member.hp}/${member.maxHp} HP` : '<span style="color:var(--danger)">Gefallen</span>'}${member.maxMana > 0 ? ` · ${member.mana}/${member.maxMana} MP` : ''} · RK ${member.armorClass}</span>
    `;
    headRow.appendChild(headInfo);
    card.appendChild(headRow);

    if (!member.isAlive) {
      const reviveWrap = document.createElement('div');
      reviveWrap.style.marginTop = '0.6rem';
      const revivers = this.party!.members.filter(
        (c) => c.isAlive && c.knownSpellIds.some((id) => SPELLS[id].revive)
      );
      if (revivers.length === 0) {
        reviveWrap.innerHTML = `<span class="action-hint">Niemand kennt einen Wiederbelebungszauber.</span>`;
      }
      for (const reviver of revivers) {
        const spellId = reviver.knownSpellIds.find((id) => SPELLS[id].revive)!;
        const spell = SPELLS[spellId];
        const btn = document.createElement('button');
        btn.textContent = `${spell.name} durch ${reviver.name} (${spell.manaCost} MP)`;
        btn.disabled = reviver.mana < spell.manaCost;
        btn.addEventListener('click', () => {
          reviver.mana -= spell.manaCost;
          const hp = this.rng.dice(spell.healDice!.count, spell.healDice!.sides);
          reviveCharacter(member, hp);
          this.log(`${reviver.name} erweckt ${member.name} mit ${spell.name} wieder zum Leben!`);
          this.renderScreen();
        });
        reviveWrap.appendChild(btn);
      }
      card.appendChild(reviveWrap);
      return card;
    }

    const slotsWrap = document.createElement('div');
    slotsWrap.style.marginTop = '0.6rem';
    slotsWrap.style.fontSize = '0.85rem';
    const slotLabels: Record<string, string> = {
      weapon: 'Waffe', offhand: 'Nebenhand', armor: 'Rüstung', accessory: 'Accessoire', head: 'Kopf',
    };
    slotsWrap.innerHTML = Object.entries(slotLabels)
      .map(([slot, label]) => `${label}: <strong>${member.equipment[slot as keyof typeof member.equipment] ? ITEMS[member.equipment[slot as keyof typeof member.equipment]!].name : '—'}</strong>`)
      .join('<br/>');
    card.appendChild(slotsWrap);

    const invWrap = document.createElement('div');
    invWrap.style.marginTop = '0.6rem';
    invWrap.style.display = 'flex';
    invWrap.style.flexDirection = 'column';
    invWrap.style.gap = '0.3rem';

    if (member.inventory.length === 0) {
      invWrap.innerHTML = `<span class="action-hint">Inventar leer.</span>`;
    }

    const otherAliveMembers = this.party!.members.filter((c) => c.isAlive && c.id !== member.id);
    const equippableSlots = new Set(['weapon', 'offhand', 'armor', 'accessory', 'head']);

    for (const stack of member.inventory) {
      const item = ITEMS[stack.itemId];
      if (!item) continue;
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.gap = '0.4rem';
      row.style.flexWrap = 'wrap';
      const label = document.createElement('span');
      label.textContent = `${item.name}${stack.quantity > 1 ? ` ×${stack.quantity}` : ''}`;
      label.title = item.description;
      row.appendChild(label);

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '0.3rem';
      actions.style.alignItems = 'center';

      if (equippableSlots.has(item.slot)) {
        const equipped = member.equipment[item.slot as 'weapon' | 'offhand' | 'armor' | 'accessory' | 'head'] === stack.itemId;
        const btn = document.createElement('button');
        btn.textContent = equipped ? 'Ausgerüstet' : 'Ausrüsten';
        btn.disabled = equipped;
        btn.addEventListener('click', () => {
          equipItem(member, stack.itemId);
          this.log(`${member.name} rüstet ${item.name} aus.`);
          this.renderScreen();
        });
        actions.appendChild(btn);
      } else if (stack.itemId === 'potion_healing') {
        const btn = document.createElement('button');
        btn.textContent = 'Trinken';
        btn.addEventListener('click', () => {
          stack.quantity -= 1;
          member.inventory = member.inventory.filter((s) => s.quantity > 0);
          const heal = Math.max(1, this.rng.dice(2, 4) + 2);
          healCharacter(member, heal);
          this.log(`${member.name} trinkt einen Heiltrank und heilt ${heal} Trefferpunkte.`);
          this.renderScreen();
        });
        actions.appendChild(btn);
      }

      if (item.value > 0) {
        const sellBtn = document.createElement('button');
        sellBtn.textContent = `Verkaufen (${item.value}G)`;
        sellBtn.addEventListener('click', () => {
          stack.quantity -= 1;
          member.inventory = member.inventory.filter((s) => s.quantity > 0);
          this.unequipIfMissing(member, stack.itemId);
          this.party!.gold += item.value;
          this.log(`${member.name} verkauft ${item.name} für ${item.value} Gold.`);
          this.renderScreen();
        });
        actions.appendChild(sellBtn);
      }

      if (otherAliveMembers.length > 0) {
        const select = document.createElement('select');
        for (const other of otherAliveMembers) {
          const opt = document.createElement('option');
          opt.value = other.id;
          opt.textContent = other.name;
          select.appendChild(opt);
        }
        const giveBtn = document.createElement('button');
        giveBtn.textContent = 'Weitergeben';
        giveBtn.addEventListener('click', () => {
          const target = this.party!.members.find((c) => c.id === select.value);
          if (!target) return;
          stack.quantity -= 1;
          member.inventory = member.inventory.filter((s) => s.quantity > 0);
          this.unequipIfMissing(member, stack.itemId);
          const targetStack = target.inventory.find((s) => s.itemId === stack.itemId);
          if (targetStack && item.stackable) targetStack.quantity += 1;
          else target.inventory.push({ itemId: stack.itemId, quantity: 1 });
          this.log(`${member.name} gibt ${item.name} an ${target.name} weiter.`);
          this.renderScreen();
        });
        actions.append(select, giveBtn);
      }

      row.appendChild(actions);
      invWrap.appendChild(row);
    }
    card.appendChild(invWrap);

    return card;
  }

  private keyHandler = (e: KeyboardEvent) => {
    if (this.screen !== 'game' || this.encounter) return;
    if (e.key === 'ArrowUp' || e.key === 'w') this.tryMove('forward');
    else if (e.key === 'ArrowDown' || e.key === 's') this.tryMove('backward');
    else if (e.key === 'ArrowLeft' && e.shiftKey) this.tryMove('left');
    else if (e.key === 'ArrowRight' && e.shiftKey) this.tryMove('right');
    else if (e.key === 'ArrowLeft' || e.key === 'a') this.turn('left');
    else if (e.key === 'ArrowRight' || e.key === 'd') this.turn('right');
  };

  private attachKeyboardControls() {
    window.removeEventListener('keydown', this.keyHandler);
    window.addEventListener('keydown', this.keyHandler);
  }

  private log(message: string) {
    const panel = document.getElementById('game-log');
    if (panel) {
      panel.textContent = message + '\n' + panel.textContent;
    }
  }

  private renderPartyHud(container: HTMLElement, opts: { clickable?: (c: Character) => void; highlightIds?: Set<string> } = {}) {
    container.innerHTML = '';
    for (const m of this.party!.members) {
      const div = document.createElement('div');
      const defending = this.encounter?.defendingIds.has(m.id);
      div.className = 'party-member' + (m.isAlive ? '' : ' dead');
      div.dataset.charId = m.id;
      const pct = Math.max(0, Math.round((m.hp / m.maxHp) * 100));
      const portrait = this.portraitEl(getClassPortrait(m.classId), defending ? 'defending' : '');
      const info = document.createElement('div');
      info.className = 'member-info';
      info.innerHTML = `
        <strong>${m.name}</strong> (Lv ${m.level})<br/>
        <span style="color:var(--text-dim)">${CLASSES[m.classId].name}</span>
        <div class="hp-bar"><div class="hp-bar-fill${pct < 30 ? ' low' : ''}" style="width:${pct}%"></div></div>
        <span style="font-size:0.75rem">${m.hp}/${m.maxHp} HP${m.maxMana > 0 ? ` · ${m.mana}/${m.maxMana} MP` : ''}</span>
      `;
      div.append(portrait, info);
      if (opts.clickable && m.isAlive) {
        div.classList.add('targetable');
        div.style.cursor = 'pointer';
        div.addEventListener('click', () => opts.clickable!(m));
      }
      if (opts.highlightIds?.has(m.id)) div.classList.add('targetable');
      container.appendChild(div);
    }
  }

  private draw() {
    if (!this.level || !this.party || !this.mainCanvas || !this.minimapCanvas) return;
    const ctx = this.mainCanvas.getContext('2d')!;
    renderViewport(ctx, this.level, this.party.position, this.party.facing);
    const mctx = this.minimapCanvas.getContext('2d')!;
    renderMinimap(mctx, this.level, this.party.position, this.party.facing);
  }

  private tryMove(dir: 'forward' | 'backward' | 'left' | 'right') {
    if (!this.level || !this.party || this.encounter) return;
    if (!canMove(this.level, this.party.position, this.party.facing, dir)) {
      this.log('Der Weg ist versperrt.');
      return;
    }
    const target = movePosition(this.party.position, this.party.facing, dir);
    const targetTile = this.level.tiles[target.y]?.[target.x];
    if (targetTile?.type === 'door' && targetTile.doorLocked) {
      const keyId = targetTile.doorKeyId ?? 'rusty_key';
      const keyHolder = this.party.members.find((m) => m.inventory.some((s) => s.itemId === keyId && s.quantity > 0));
      if (!keyHolder) {
        this.log('Die Tür ist verschlossen. Du benötigst einen Schlüssel.');
        this.draw();
        return;
      }
      const stack = keyHolder.inventory.find((s) => s.itemId === keyId)!;
      stack.quantity -= 1;
      keyHolder.inventory = keyHolder.inventory.filter((s) => s.quantity > 0);
      targetTile.doorLocked = false;
      this.log(`${keyHolder.name} schließt die verschlossene Tür mit dem rostigen Schlüssel auf.`);
    }
    this.party.position = target;
    discoverAround(this.level, this.party.position, 1);
    this.checkTileEvents();
    this.draw();
  }

  private turn(dir: 'left' | 'right') {
    if (!this.party || this.encounter) return;
    this.party.facing = dir === 'left' ? turnLeft(this.party.facing) : turnRight(this.party.facing);
    this.draw();
  }

  private checkTileEvents() {
    if (!this.level || !this.party) return;
    const pos = this.party.position;
    const tile = this.level.tiles[pos.y][pos.x];

    if (tile.trap && !tile.trap.triggered) {
      tile.trap.triggered = true;
      const dmg = this.rng.dice(tile.trap.damageDice.count, tile.trap.damageDice.sides);
      const victim = this.party.members.find((m) => m.isAlive);
      if (victim) {
        applyDamageToCharacter(victim, dmg);
        this.log(`Falle ausgelöst! ${victim.name} erleidet ${dmg} Schaden.`);
        this.renderScreen();
        return;
      }
    }

    const monsterSpawn = this.level.monsterSpawns.find((s) => !s.triggered && s.position.x === pos.x && s.position.y === pos.y);
    if (monsterSpawn) {
      monsterSpawn.triggered = true;
      if (monsterSpawn.isBoss) this.log(`⚔ Der Endgegner erwacht: ${MONSTERS[monsterSpawn.monsterIds[0]].name}!`);
      this.startEncounter(monsterSpawn.monsterIds, monsterSpawn.isBoss);
      return;
    }

    const treasure = this.level.treasureSpawns.find((s) => !s.looted && s.position.x === pos.x && s.position.y === pos.y);
    if (treasure) {
      treasure.looted = true;
      this.party.gold += treasure.gold;
      const alive = this.party.members.find((m) => m.isAlive);
      for (const item of treasure.items) {
        alive?.inventory.push(item);
        if (alive) this.grantLootFollowUp(alive, item.itemId);
      }
      const foundKey = treasure.items.some((i) => i.itemId === 'rusty_key');
      this.log(
        foundKey
          ? 'Du findest einen rostigen Schlüssel!'
          : `Schatz gefunden: ${treasure.gold} Gold${treasure.items.length ? ' und Gegenstände' : ''}.`
      );
    }

    const chest = this.level.chestSpawns.find((c) => !c.opened && c.position.x === pos.x && c.position.y === pos.y);
    if (chest) {
      this.openChest(chest);
      return;
    }

    if (tile.type === 'stairsDown') {
      this.log('Du erreichst die Treppe nach unten.');
      this.offerDescend();
    }
  }

  private grantLootFollowUp(character: Character, itemId: string): boolean {
    const item = ITEMS[itemId];
    if (!item) return false;
    if (
      (item.slot === 'weapon' || item.slot === 'offhand' || item.slot === 'armor' || item.slot === 'accessory') &&
      autoEquipIfBetter(character, itemId)
    ) {
      this.log(`${character.name} rüstet ${item.name} aus.`);
      return true;
    }
    return false;
  }

  private openChest(chest: ChestSpawn) {
    if (!this.party) return;
    chest.opened = true;
    this.party.gold += chest.gold;

    if (chest.lootKind === 'monster' && chest.monsterId) {
      this.log(`Die Truhe ist eine Falle! ${MONSTERS[chest.monsterId].name} greift an!`);
      this.startEncounter([chest.monsterId]);
      return;
    }

    if ((chest.lootKind === 'weapon' || chest.lootKind === 'shield') && chest.itemId) {
      const alive = this.party.members.find((m) => m.isAlive);
      alive?.inventory.push({ itemId: chest.itemId, quantity: 1 });
      const item = ITEMS[chest.itemId];
      this.log(`Truhe geöffnet: ${item.name} gefunden!`);
      if (alive) this.grantLootFollowUp(alive, chest.itemId);
    } else if (chest.lootKind === 'spell' && chest.spellId) {
      const spell = SPELLS[chest.spellId];
      const learner = this.party.members.find(
        (m) => m.isAlive && !m.knownSpellIds.includes(spell.id) && ((spell.school === 'arcane' && CLASSES[m.classId].canCastArcane) || (spell.school === 'divine' && CLASSES[m.classId].canCastDivine))
      );
      if (learner) {
        learner.knownSpellIds.push(spell.id);
        this.log(`Truhe geöffnet: ${learner.name} erlernt den Zauber ${spell.name}!`);
      } else {
        this.log(`Truhe geöffnet: eine Zauberschriftrolle (${spell.name}) zerfällt zu Staub.`);
      }
    }
    this.renderScreen();
  }

  private offerDescend() {
    const campaign = getCampaignById(this.party!.campaignId)!;
    const nextIndex = this.party!.levelIndex + 1;
    const panel = document.getElementById('game-log');
    if (!panel) return;
    const btn = document.createElement('button');
    btn.textContent = nextIndex < campaign.levelCount ? 'Weiter absteigen' : 'Kampagne abschließen';
    btn.style.marginTop = '0.4rem';
    btn.addEventListener('click', () => {
      if (nextIndex < campaign.levelCount) {
        const seed = `${campaign.id}-${nextIndex}-${Date.now()}`;
        this.startLevel(campaign.id, nextIndex, seed);
      } else {
        this.completeCampaign(campaign.id);
      }
    });
    panel.prepend(btn);
  }

  private completeCampaign(campaignId: string) {
    const next = getNextCampaign(campaignId);
    if (next) {
      alert(`Kampagne "${getCampaignById(campaignId)!.name}" abgeschlossen! Weiter geht es mit "${next.name}".`);
      this.beginNewGame(next.id);
    } else {
      alert('Herzlichen Glückwunsch! Du hast alle vier Kampagnen von Dungeon Crawler 2026 abgeschlossen!');
      this.screen = 'title';
      this.renderScreen();
    }
  }

  private rest() {
    if (!this.party) return;
    for (const m of this.party.members) {
      if (!m.isAlive) continue;
      m.hp = m.maxHp;
      m.mana = m.maxMana;
    }
    this.log('Die Gruppe rastet und erholt sich vollständig.');
    this.renderScreen();
  }

  private doSave() {
    if (!this.party || !this.level) return;
    const progress: Record<string, { unlocked: boolean; completed: boolean; highestLevelReached: number }> = {};
    saveGame(this.activeSaveSlot, {
      party: this.party,
      campaignProgress: progress,
      dungeonSeed: this.level.seed,
    });
    this.log('Spiel gespeichert.');
  }

  // ---------------- COMBAT ----------------

  private startEncounter(monsterIds: string[], isBoss = false) {
    if (!this.party) return;
    this.encounter = new Encounter(this.party.members, monsterIds, this.rng, isBoss);
    this.combatMode = 'menu';
    this.pendingSpellId = null;
    this.renderCombatOverlay();
    void this.processAiTurns();
  }

  private renderCombatOverlay() {
    const existing = document.querySelector('.combat-overlay');
    existing?.remove();
    if (!this.encounter) return;
    const enc = this.encounter;

    const overlay = document.createElement('div');
    overlay.className = 'combat-overlay';
    overlay.innerHTML = `<h2>Kampf!</h2>`;

    const monsterList = document.createElement('div');
    monsterList.className = 'monster-list';
    const targetingMonsters = this.combatMode === 'targetAttack' || this.combatMode === 'targetSpellDamage';
    enc.monsters.forEach((m, i) => {
      const def = MONSTERS[m.defId];
      const card = document.createElement('div');
      card.className =
        'monster-card' + (m.isAlive ? '' : ' dead') + (targetingMonsters && m.isAlive ? ' targetable' : '') + (m.isBoss ? ' boss' : '');
      card.dataset.monsterIndex = String(i);
      const portrait = this.portraitEl(getMonsterPortrait(m.defId), m.isBoss ? 'large' : '');
      const info = document.createElement('div');
      info.innerHTML = `${m.isBoss ? '<span class="boss-tag">ENDGEGNER</span>' : ''}<strong>${def.name}</strong><div class="hp-bar"><div class="hp-bar-fill" style="width:${Math.max(0, Math.round((m.hp / m.maxHp) * 100))}%"></div></div><span style="font-size:0.75rem">${Math.max(0, m.hp)}/${m.maxHp} HP</span>`;
      card.append(portrait, info);
      if (targetingMonsters && m.isAlive) {
        card.addEventListener('click', () => this.onMonsterTargetChosen(i));
      }
      monsterList.appendChild(card);
    });
    overlay.appendChild(monsterList);

    const partyHud = document.createElement('div');
    partyHud.className = 'party-hud';
    const healTargeting = this.combatMode === 'targetSpellHeal';
    this.renderPartyHud(partyHud, healTargeting ? { clickable: (c) => this.onHealTargetChosen(c) } : {});
    overlay.appendChild(partyHud);

    const currentActor = enc.currentActor();
    const turnInfo = document.createElement('div');
    turnInfo.className = 'card actor-banner';
    if (currentActor?.kind === 'character') {
      turnInfo.append(this.portraitEl(getClassPortrait(currentActor.character.classId)));
      const txt = document.createElement('div');
      txt.innerHTML = `<strong>${currentActor.character.name} ist am Zug.</strong>`;
      turnInfo.appendChild(txt);
    } else if (currentActor?.kind === 'monster') {
      turnInfo.append(this.portraitEl(getMonsterPortrait(currentActor.monster.defId)));
      const txt = document.createElement('div');
      txt.innerHTML = `<strong>${MONSTERS[currentActor.monster.defId].name} ist am Zug...</strong>`;
      turnInfo.appendChild(txt);
    } else if (enc.finished) {
      turnInfo.innerHTML = enc.victory
        ? '<strong style="color:var(--success)">Sieg!</strong>'
        : '<strong style="color:var(--danger)">Die Gruppe wurde besiegt...</strong>';
    }
    overlay.appendChild(turnInfo);

    if (currentActor?.kind === 'character' && !enc.finished && !this.combatBusy) {
      overlay.appendChild(this.buildActionArea(currentActor.character));
    }

    const log = document.createElement('div');
    log.className = 'log-panel';
    log.textContent = enc.log.slice(-8).reverse().join('\n');
    overlay.appendChild(log);

    if (enc.finished) {
      const closeBtn = document.createElement('button');
      closeBtn.textContent = enc.victory ? 'Weiter' : 'Zurück zum Titelbildschirm';
      closeBtn.addEventListener('click', () => this.resolveEncounterEnd());
      overlay.appendChild(closeBtn);
    }

    this.root.appendChild(overlay);
    this.applyLastActionAnimation(overlay, enc);
  }

  private buildActionArea(character: Character): HTMLElement {
    const wrap = document.createElement('div');

    if (this.combatMode === 'menu') {
      const menu = document.createElement('div');
      menu.className = 'action-menu';

      const attackBtn = document.createElement('button');
      attackBtn.textContent = '⚔ Angriff';
      attackBtn.addEventListener('click', () => {
        this.combatMode = 'targetAttack';
        this.renderCombatOverlay();
      });
      menu.appendChild(attackBtn);

      if (character.knownSpellIds.length > 0) {
        const spellBtn = document.createElement('button');
        spellBtn.textContent = '✨ Zaubern';
        spellBtn.addEventListener('click', () => {
          this.combatMode = 'spellMenu';
          this.renderCombatOverlay();
        });
        menu.appendChild(spellBtn);
      }

      const defendBtn = document.createElement('button');
      defendBtn.textContent = '🛡 Verteidigen';
      defendBtn.addEventListener('click', () => this.runPlayerAction(() => this.encounter!.playerDefend(character)));
      menu.appendChild(defendBtn);

      if (hasHealingPotion(character)) {
        const itemBtn = document.createElement('button');
        itemBtn.textContent = '🧪 Trank';
        itemBtn.addEventListener('click', () => this.runPlayerAction(() => this.encounter!.playerUseHealingPotion(character)));
        menu.appendChild(itemBtn);
      }

      wrap.appendChild(menu);
    } else if (this.combatMode === 'spellMenu') {
      const menu = document.createElement('div');
      menu.className = 'action-menu';
      for (const spellId of character.knownSpellIds) {
        const spell = SPELLS[spellId];
        const btn = document.createElement('button');
        btn.textContent = `${spell.name} (${spell.manaCost} MP)`;
        btn.title = spell.description;
        btn.disabled = character.mana < spell.manaCost;
        btn.addEventListener('click', () => {
          this.pendingSpellId = spellId;
          this.combatMode = spell.healDice ? 'targetSpellHeal' : 'targetSpellDamage';
          this.renderCombatOverlay();
        });
        menu.appendChild(btn);
      }
      const cancel = document.createElement('button');
      cancel.textContent = 'Zurück';
      cancel.addEventListener('click', () => {
        this.combatMode = 'menu';
        this.renderCombatOverlay();
      });
      menu.appendChild(cancel);
      wrap.appendChild(menu);
    } else if (this.combatMode === 'targetAttack') {
      const hint = document.createElement('div');
      hint.className = 'action-hint';
      hint.textContent = 'Wähle ein Ziel durch Klick auf ein Monster.';
      wrap.appendChild(hint);
      wrap.appendChild(this.cancelButton());
    } else if (this.combatMode === 'targetSpellDamage') {
      const hint = document.createElement('div');
      hint.className = 'action-hint';
      hint.textContent = `${SPELLS[this.pendingSpellId!].name}: Wähle ein Ziel durch Klick auf ein Monster.`;
      wrap.appendChild(hint);
      wrap.appendChild(this.cancelButton());
    } else if (this.combatMode === 'targetSpellHeal') {
      const hint = document.createElement('div');
      hint.className = 'action-hint';
      hint.textContent = `${SPELLS[this.pendingSpellId!].name}: Wähle einen Verbündeten durch Klick.`;
      wrap.appendChild(hint);
      wrap.appendChild(this.cancelButton());
    }

    return wrap;
  }

  private cancelButton(): HTMLButtonElement {
    const cancel = document.createElement('button');
    cancel.textContent = 'Abbrechen';
    cancel.addEventListener('click', () => {
      this.combatMode = 'menu';
      this.pendingSpellId = null;
      this.renderCombatOverlay();
    });
    return cancel;
  }

  private onMonsterTargetChosen(monsterIndex: number) {
    if (!this.encounter) return;
    const actor = this.encounter.currentActor();
    if (!actor || actor.kind !== 'character') return;
    if (this.combatMode === 'targetAttack') {
      this.runPlayerAction(() => this.encounter!.playerAttack(actor.character, monsterIndex));
    } else if (this.combatMode === 'targetSpellDamage' && this.pendingSpellId) {
      const spell = SPELLS[this.pendingSpellId];
      this.runPlayerAction(() => this.encounter!.playerCastDamageSpell(actor.character, spell, monsterIndex));
    }
  }

  private onHealTargetChosen(target: Character) {
    if (!this.encounter || this.combatMode !== 'targetSpellHeal' || !this.pendingSpellId) return;
    const actor = this.encounter.currentActor();
    if (!actor || actor.kind !== 'character') return;
    const spell = SPELLS[this.pendingSpellId];
    this.runPlayerAction(() => this.encounter!.playerCastHealSpell(actor.character, spell, target));
  }

  private runPlayerAction(action: () => void) {
    if (!this.encounter || this.combatBusy) return;
    action();
    this.combatMode = 'menu';
    this.pendingSpellId = null;
    this.renderCombatOverlay();
    void this.processAiTurns();
  }

  /** Führt gegnerische Züge nacheinander mit kurzer Verzögerung aus, bis der Spieler wieder an der Reihe ist. */
  private async processAiTurns() {
    if (!this.encounter) return;
    this.combatBusy = true;
    while (!this.encounter.finished) {
      const actor = this.encounter.currentActor();
      if (!actor || actor.kind === 'character') break;
      await wait(550);
      this.encounter.monsterTurn(actor.monster);
      this.renderCombatOverlay();
      await wait(450);
    }
    this.combatBusy = false;
    this.renderCombatOverlay();
  }

  private applyLastActionAnimation(overlay: HTMLElement, enc: Encounter) {
    const action: LastAction | null = enc.lastAction;
    if (!action) return;
    enc.lastAction = null;

    const findEl = (ref: { kind: 'character' | 'monster'; key: string }): HTMLElement | null => {
      if (ref.kind === 'character') return overlay.querySelector(`[data-char-id="${ref.key}"]`);
      return overlay.querySelector(`[data-monster-index="${ref.key}"]`);
    };

    const attackerEl = findEl(action.attacker);
    const targetEl = action.target ? findEl(action.target) : null;

    if (action.kind === 'attack' || action.kind === 'spellDamage') {
      if (attackerEl) attackerEl.classList.add(action.attacker.kind === 'character' ? 'anim-lunge-right' : 'anim-lunge-left');
      if (targetEl) {
        if (action.hit) targetEl.classList.add('anim-hit');
        this.spawnFloatingNumber(targetEl, action.hit ? `-${action.amount}` : 'Verfehlt!', action.hit ? (action.critical ? 'crit' : 'damage') : 'miss');
      }
    } else if (action.kind === 'spellHeal' || action.kind === 'item') {
      if (attackerEl && attackerEl !== targetEl) attackerEl.classList.add('anim-lunge-right');
      if (targetEl) {
        targetEl.classList.add('anim-heal');
        this.spawnFloatingNumber(targetEl, `+${action.amount}`, 'heal');
      }
    } else if (action.kind === 'defend') {
      if (attackerEl) attackerEl.classList.add('anim-heal');
    }
  }

  private spawnFloatingNumber(target: HTMLElement, text: string, cls: string) {
    const span = document.createElement('span');
    span.className = `floating-number ${cls}`;
    span.textContent = text;
    target.appendChild(span);
    span.addEventListener('animationend', () => span.remove());
  }

  private resolveEncounterEnd() {
    if (!this.encounter || !this.party) return;
    const victory = this.encounter.victory;
    if (victory) {
      let totalXp = 0;
      let totalGold = 0;
      const drops: string[] = [];
      for (const m of this.encounter.monsters) {
        const def = MONSTERS[m.defId];
        totalXp += def.xpReward;
        totalGold += this.rng.dice(def.goldReward.count, def.goldReward.sides);
        if (def.dropItemIds && def.dropItemIds.length > 0 && this.rng.chance(def.dropChance ?? 0.4)) {
          drops.push(this.rng.pick(def.dropItemIds));
        }
      }
      this.party.gold += totalGold;
      const aliveMembers = this.party.members.filter((m) => m.isAlive);
      const xpShare = aliveMembers.length > 0 ? Math.floor(totalXp / aliveMembers.length) : 0;
      for (const m of aliveMembers) grantXp(m, xpShare);
      this.log(`Sieg! +${totalXp} EP, +${totalGold} Gold.`);

      // Beute wird reihum auf die überlebenden Gruppenmitglieder verteilt.
      if (drops.length > 0 && aliveMembers.length > 0) {
        drops.forEach((itemId, i) => {
          const receiver = aliveMembers[i % aliveMembers.length];
          receiver.inventory.push({ itemId, quantity: 1 });
          const item = ITEMS[itemId];
          this.log(`Beute: ${receiver.name} erhält ${item.name}.`);
          this.grantLootFollowUp(receiver, itemId);
        });
      }
      this.encounter = null;
      document.querySelector('.combat-overlay')?.remove();
      this.renderScreen();
    } else {
      this.encounter = null;
      this.party = null;
      this.screen = 'title';
      this.renderScreen();
    }
  }
}
