class Inventory {
    constructor() {
        this.items = [];
        this.maxItems = 10;
    }

    addItem(item) {
        if (this.items.length < this.maxItems) {
            this.items.push(item);
            return true;
        }
        return false;
    }

    removeItem(index) {
        if (index >= 0 && index < this.items.length) {
            return this.items.splice(index, 1)[0];
        }
        return null;
    }

    useItem(index) {
        const item = this.items[index];
        if (item) {
            // Apply item effect
            if (item.type === 'health') {
                player.health += item.value;
            }
            this.removeItem(index);
        }
    }
} 