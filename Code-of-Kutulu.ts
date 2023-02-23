/**
 * Survive the wrath of Kutulu
 **/

enum Direction { Up, Right, Down, Left }

class Position {
    constructor(
        public x: number,
        public y: number
    ) { }
    equals(other: Position): boolean {
        return this.x === other.x && this.y === other.y;
    }
    neighbour(dir: Direction): Position {
        switch (dir) {
            case Direction.Up: return new Position(this.x, this.y - 1);
            case Direction.Right: return new Position(this.x + 1, this.y);
            case Direction.Down: return new Position(this.x, this.y + 1);
            case Direction.Left: return new Position(this.x - 1, this.y);
        }
    }
}

class Entity {
    id: number;
    type: string;
    pos: Position;
}

class Explorer extends Entity {
    sanity: number;
}

class Wanderer extends Entity {
    timeLeft: number;
    spawned: boolean;
    target: number;
}

const width: number = parseInt(readline());
const height: number = parseInt(readline());

// # : wall
// w : spawn for wanderers
// . : empty cell
const map: string[] = [];

let me: Explorer;
let lastDirection = Direction.Up;
let otherExplorers: Explorer[] = [];
let wanderers: Wanderer[] = [];

for (let i = 0; i < height; i++) {
    const line: string = readline();
    map.push(line);
}

var inputs: string[] = readline().split(' ');
const sanityLossLonely: number = parseInt(inputs[0]); // how much sanity you lose every turn when alone, always 3 until wood 1
const sanityLossGroup: number = parseInt(inputs[1]); // how much sanity you lose every turn when near another player, always 1 until wood 1
const wandererSpawnTime: number = parseInt(inputs[2]); // how many turns the wanderer take to spawn, always 3 until wood 1
const wandererLifeTime: number = parseInt(inputs[3]); // how many turns the wanderer is on map after spawning, always 40 until wood 1

// game loop
while (true) {

    // RESET GAME DATA
    otherExplorers = [];
    wanderers = [];

    // READ INPUTS
    const entityCount: number = parseInt(readline()); // the first given entity corresponds to your explorer
    for (let i = 0; i < entityCount; i++) {
        var inputs: string[] = readline().split(' ');
        const entityType: string = inputs[0];
        const id: number = parseInt(inputs[1]);
        const x: number = parseInt(inputs[2]);
        const y: number = parseInt(inputs[3]);
        const param0: number = parseInt(inputs[4]);
        const param1: number = parseInt(inputs[5]);
        const param2: number = parseInt(inputs[6]);

        addEntity(i, entityType, id, x, y, param0, param1, param2);
    }

    // PLAY !!!
    const directions = getAvailableDirections();
    if (directions.length > 0) {
        let selectedDirection: Direction;
        if (directions.includes(lastDirection)) {
            selectedDirection = lastDirection;
        } else {
            selectedDirection = directions[0];
        }
        lastDirection = selectedDirection;
        const selectedDest = myPosition().neighbour(selectedDirection);
        console.log('MOVE ' + selectedDest.x + ' ' + selectedDest.y);
    } else {
        console.log('WAIT');
    }
}

// ENTITIES
function getExplorers(): Explorer[] {
    return otherExplorers;
}

function getWanderers(): Wanderer[] {
    return wanderers;
}

// POSITIONS
function tileAt(pos: Position): string {
    return map[pos.y].charAt(pos.x);
}

function explorersAt(pos: Position): Explorer[] {
    return getExplorers().filter(e => e.pos.equals(pos));
}

function wanderersAt(pos: Position): Wanderer[] {
    return getWanderers().filter(w => w.pos.equals(pos));
}

function myPosition(): Position {
    return me.pos;
}

// DECISIONS
function getAvailableDirections(): Direction[] {
    const result: Direction[] = [];
    if (isFreeSpace(myPosition().neighbour(Direction.Up))) { result.push(Direction.Up) }
    if (isFreeSpace(myPosition().neighbour(Direction.Right))) { result.push(Direction.Right) }
    if (isFreeSpace(myPosition().neighbour(Direction.Down))) { result.push(Direction.Down) }
    if (isFreeSpace(myPosition().neighbour(Direction.Left))) { result.push(Direction.Left) }
    return result;
}

function isFreeSpace(pos: Position) {
    return tileAt(pos) !== '#' && wanderersAt(pos).length === 0;
}

// STORE GAME DATA
function addEntity(entityOrder: number, type: string, id: number, x: number, y: number, param0: number, param1: number, param2: number): Entity {
    let result;
    switch (type) {
        case 'EXPLORER': {
            result = new Explorer();
            result.sanity = param0;
            if (entityOrder === 0) {
                me = result;
            } else {
                otherExplorers.push(result);
            }
            break;
        }
        case 'WANDERER': {
            result = new Wanderer();
            result.timeLeft = param0;
            result.spawned = param1 === 1;
            result.target = param2;
            wanderers.push(result);
            break;
        }
        default: {
            console.error("Unknown entity type: " + type);
            result = new Entity()
        }
    }
    result.id = id;
    result.type = type;
    result.pos = new Position(x, y);

    return result;
}