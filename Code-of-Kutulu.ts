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
        if (!other) { return false; }
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

class Path {
    constructor(public start: Position) { }
    private firstStep = new Step(null, this.start);
    depth = 0;
    visitedPositions: Step[] = [this.firstStep];
    activeSteps = [this.firstStep];

    visited(pos: Position): boolean {
        return this.visitedPositions.some(existing => existing.pos.equals(pos));
    }

    nextStep() {
        const nextActiveSteps: Step[] = [];
        this.depth++;
        this.activeSteps.forEach(activeStep => {
            const positions = activeStep.getAvailableNextPositions();
            positions
                .filter(pos => !this.visited(pos))
                .forEach(newlyReachablePos => {
                    if (!nextActiveSteps.some(step => step.pos.equals(newlyReachablePos))) {
                        const newStep = new Step(activeStep, newlyReachablePos);
                        this.visitedPositions.push(newStep);
                        nextActiveSteps.push(newStep);
                    }
                });
        })
        this.activeSteps = nextActiveSteps;
    }

    // Only path. Exclude source and target themselves
    reconstructPathTo(pos: Position): Position[] | null {
        let currentStep = this.visitedPositions.find(step => step.pos.equals(pos));
        if (currentStep) {
            let result: Position[] = [];
            while (currentStep.backStep != null && !currentStep.backStep.pos.equals(this.firstStep.pos)) {
                result.unshift(currentStep.backStep.pos);
                currentStep = currentStep.backStep;
            }
            return result;
        } else {
            return null;
        }
    }
}

class Step {
    constructor(public backStep: Step | null, public pos: Position) { }
    getAvailableNextPositions(): Position[] {
        return getAvailableDirections(this.pos).map(dir => this.pos.neighbour(dir));
    }
}

interface EntityPath<T extends Entity> { entity: T, path: Position[] }

// # : wall
// w : spawn for wanderers
// . : empty cell
const map: string[] = [];

let me: Explorer;
let otherExplorers: Explorer[] = [];
let wanderers: Wanderer[] = [];


// READ GAME DATA
const width: number = parseInt(readline());
const height: number = parseInt(readline());

for (let i = 0; i < height; i++) {
    const line: string = readline();
    map.push(line);
}

var inputs: string[] = readline().split(' ');
const sanityLossLonely: number = parseInt(inputs[0]); // how much sanity you lose every turn when alone, always 3 until wood 1
const sanityLossGroup: number = parseInt(inputs[1]); // how much sanity you lose every turn when near another player, always 1 until wood 1
const wandererSpawnTime: number = parseInt(inputs[2]); // how many turns the wanderer take to spawn, always 3 until wood 1
const wandererLifeTime: number = parseInt(inputs[3]); // how many turns the wanderer is on map after spawning, always 40 until wood 1

// GAME LOOP
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
    const pathsToExplorers: EntityPath<Explorer>[] = getExplorers()
        .map(ex => calculateEntityPath(myPosition(), ex))
        .filter(item => item.path.length > 0)
        .sort((a, b) => a.path.length - b.path.length);
    const pathsToWanderers: EntityPath<Wanderer>[] = getWanderers()
        .map(w => calculateEntityPath(myPosition(), w))
        .filter(item => item.path.length > 0)
        .sort((a, b) => a.path.length - b.path.length);


    const nearestExplorer = pathsToExplorers[0];
    const nearestWanderer = pathsToWanderers[0];

    let pos;

    if (nearestExplorer) {
        pos = nearestExplorer.path[0];
    }

    if (nearestWanderer && nearestWanderer.path.length < 3) {
        pos = awayFrom(myPosition(), nearestWanderer.path[0]);
    }

    if (pos && !pos.equals(myPosition())) {
        console.log('MOVE ' + pos.x + ' ' + pos.y);
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

// DISTANCES
function calculateEntityPath<T extends Entity>(a: Position, b: T): EntityPath<T> {
    return { entity: b, path: calculatePathTo(a, b) };
}

function calculatePathTo(a: Position, b: Entity): Position[] {
    if (!b || a.equals(b.pos)) {
        return [];
    }

    const pathsFromSource = new Path(a);
    const pathsFromTarget = new Path(b.pos);
    while (!haveInterjection(pathsFromSource, pathsFromTarget) && pathsFromSource.depth < 6) {
        pathsFromSource.nextStep();
        pathsFromTarget.nextStep();
    }

    const interjection = getInterjection(pathsFromSource, pathsFromTarget);
    const result: Position[] = []
    if (interjection) {
        const stepsFromSource = pathsFromSource.reconstructPathTo(interjection.pos);
        const stepsFromTarget = pathsFromTarget.reconstructPathTo(interjection.pos);

        stepsFromSource?.forEach(step => result.push(step));
        result.push(interjection.pos);
        stepsFromTarget?.reverse()?.forEach(step => result.push(step));
        if (!interjection.pos.equals(b.pos)) {
            result.push(b.pos);
        }
    }
    return result;
}

function getInterjection(a: Path, b: Path): Step | undefined {
    if (!a || !b) {
        return undefined;
    }
    return a.visitedPositions.find(src => b.visited(src.pos));
}

function haveInterjection(a: Path, b: Path): boolean {
    return getInterjection(a, b) !== undefined;
}

// DECISIONS
function getAvailableDirections(pos: Position): Direction[] {
    const result: Direction[] = [];
    if (isFreeSpace(pos.neighbour(Direction.Up))) { result.push(Direction.Up) }
    if (isFreeSpace(pos.neighbour(Direction.Right))) { result.push(Direction.Right) }
    if (isFreeSpace(pos.neighbour(Direction.Down))) { result.push(Direction.Down) }
    if (isFreeSpace(pos.neighbour(Direction.Left))) { result.push(Direction.Left) }
    return result;
}

function awayFrom(pos: Position, thread: Position): Position {
    return getAvailableDirections(pos).map(dir => pos.neighbour(dir)).filter(pos => !pos.equals(thread))[0] || thread;
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