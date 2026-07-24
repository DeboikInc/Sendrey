"use client";

import { useState } from "react";

const AccordionItem = ({ id, title, children, isOpen, onClick }) => {
  return (
    <div className="w-full mb-2">
      <h2 id={`accordion-flush-heading-${id}`}>
        <button
          type="button"
          className="flex items-center justify-between w-full py-5 font-medium rtl:text-right text-gray-200 bg-secondary rounded-lg px-5 gap-3"
          onClick={() => onClick(id)}
          aria-expanded={isOpen}
          aria-controls={`accordion-flush-body-${id}`}
        >
          <span>{title}</span>
          <span
            className={`text-2xl transition-transform transform ${
              isOpen ? "rotate-45" : ""
            }`}
          >
            +
          </span>
        </button>
      </h2>
      <div
        id={`accordion-flush-body-${id}`}
        className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0"
        }`}
        aria-labelledby={`accordion-flush-heading-${id}`}
      >
        <div className="py-5 border-b border-gray-1002 space-y-3 text-gray-800 transition-all duration-300">
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * @param {{ items: { id: string, title: string, content: React.ReactNode }[] }} props
 */
export const Accordion = ({ items }) => {
  const [openId, setOpenId] = useState(null);

  const handleToggle = (id) => {
    setOpenId((prevId) => (prevId === id ? null : id));
  };

  return (
    <div className="mb-8">
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          id={item.id}
          title={item.title}
          isOpen={openId === item.id}
          onClick={handleToggle}
        >
          <p>{item.content}</p>
        </AccordionItem>
      ))}
    </div>
  );
};