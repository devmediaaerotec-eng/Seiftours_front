import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';

export default function ElegantSelect({
  value,
  onChange,
  options,
  placeholder = 'Sélectionner...',
  icon: Icon,
  ariaLabel,
}) {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <Listbox.Button
          aria-label={ariaLabel}
          className="relative h-[42px] w-full cursor-pointer rounded-xl bg-[var(--mist)] border border-transparent pr-10 text-left focus:outline-none focus:bg-white focus:border-[var(--sea)] focus:ring-4 focus:ring-[var(--sea)]/10 hover:bg-white/60 transition-all"
          style={{ paddingLeft: Icon ? '2.5rem' : '1rem' }}
        >
          {Icon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Icon size={15} className="text-[var(--mute)]" aria-hidden="true" />
            </span>
          )}

          <span
            className={`block truncate text-sm ${
              selectedOption && selectedOption.value !== '' ? 'text-[var(--ink)] font-semibold' : 'text-[var(--mute)] font-semibold'
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>

          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <ChevronDown size={14} className="text-[var(--mute)]" aria-hidden="true" />
          </span>
        </Listbox.Button>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute mt-1 max-h-60 w-full min-w-[160px] overflow-auto rounded-xl bg-white py-1 text-sm shadow-lg border border-[var(--line)] focus:outline-none z-50">
            {options.map((opt) => (
              <Listbox.Option
                key={opt.value}
                value={opt.value}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2.5 pl-10 pr-4 transition-colors ${
                    active ? 'bg-[var(--mist)] text-[var(--sea)]' : 'text-[var(--ink)]'
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-bold' : 'font-normal'}`}>{opt.label}</span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--sea)]">
                        <Check size={16} aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}