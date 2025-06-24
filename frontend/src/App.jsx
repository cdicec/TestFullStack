import { useState, useEffect, useRef } from 'react';
import './App.css';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ id, selected, onSelect }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: '4px',
    borderBottom: '1px solid #ccc',
    background: selected ? '#def' : 'white'
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <input
        type="checkbox"
        checked={selected}
        onChange={e => onSelect(id, e.target.checked)}
      />
      {id}
    </div>
  );
}

function App() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const loader = useRef(null);

  const fetchItems = async (start = 0, append = false, currentSearch = search) => {
    const res = await fetch(
      `http://localhost:3001/data?search=${encodeURIComponent(currentSearch)}&start=${start}&count=20`,
      { credentials: 'include' }
    );
    const data = await res.json();
    setTotal(data.total);
    setItems(prev => (append ? [...prev, ...data.items] : data.items));
  };

  useEffect(() => {
    fetchItems();
  }, [search]);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && items.length < total) {
        fetchItems(items.length, true);
      }
    });
    if (loader.current) observer.observe(loader.current);
    return () => observer.disconnect();
  }, [items, total]);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      setItems(arrayMove(items, oldIndex, newIndex));
      fetch('http://localhost:3001/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ search, fromIndex: oldIndex, toIndex: newIndex })
      });
    }
  };

  const toggleSelect = (id, sel) => {
    setItems(items.map(it => (it.id === id ? { ...it, selected: sel } : it)));
    fetch('http://localhost:3001/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, selected: sel })
    });
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      <input
        placeholder="Search"
        value={search}
        onChange={e => {
          setItems([]);
          setSearch(e.target.value);
        }}
      />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <SortableItem key={item.id} id={item.id} selected={item.selected} onSelect={toggleSelect} />
          ))}
        </SortableContext>
      </DndContext>
      <div ref={loader} style={{ height: 20 }} />
    </div>
  );
}

export default App;
