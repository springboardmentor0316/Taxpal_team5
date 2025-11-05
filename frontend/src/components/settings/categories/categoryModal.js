import React, { useEffect, useRef, useState } from "react";
import "./categoryModal.css";

export default function CategoryModal({ open, initialType = "expense", onClose, onSave }) {
  const dialogRef = useRef(null);
  const [type, setType] = useState(initialType); // "expense" | "income"
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");

  useEffect(() => {
    if (open && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
    if (!open && dialogRef.current && dialogRef.current.open) {
      dialogRef.current.close();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setType(initialType);
      setName("");
      setColor("#3b82f6");
    }
  }, [open, initialType]);

  const valid = name.trim().length > 1;

  const handleSave = () => {
    if (!valid) return;
    onSave({ type, name: name.trim(), color });
  };

  const onCancel = () => onClose && onClose();

  return (
    <dialog ref={dialogRef} className="cat-modal" onCancel={onCancel}>
      <div className="modal-head">
        <h3 className="modal-title">Add Category</h3>
        <button className="modal-x" onClick={onCancel} aria-label="Close">✕</button>
      </div>

      <div className="modal-body">
        <label className="set-field">
          <span className="set-label">Category type</span>
          <div className="type-row">
            <label className={`pill ${type==="expense"?"active":""}`}>
              <input type="radio" name="ctype" value="expense" checked={type==="expense"} onChange={()=>setType("expense")} />
              <span>Expense</span>
            </label>
            <label className={`pill ${type==="income"?"active":""}`}>
              <input type="radio" name="ctype" value="income" checked={type==="income"} onChange={()=>setType("income")} />
              <span>Income</span>
            </label>
          </div>
        </label>

        <label className="set-field">
          <span className="set-label">Name</span>
          <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g., Marketing" />
        </label>

        <label className="set-field">
          <span className="set-label">Color</span>
          <input
            type="color"
            className="color-square"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
      </div>

      <div className="modal-foot">
        <button className="btn11" onClick={onCancel} type="button">Cancel</button>
        <button className="btn primary" onClick={handleSave} type="button" disabled={!valid}>Add</button>
      </div>
    </dialog>
  );
}
