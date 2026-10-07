export default `<svg class="p-art" viewBox="0 0 640 500" role="img" aria-label="لابتوب وكتب ونبتة على مكتب">
      <defs>
        <linearGradient id="scr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--scr-a)"/><stop offset="1" style="stop-color:var(--scr-b)"/></linearGradient>
        <radialGradient id="halo"><stop offset="0" style="stop-color:var(--primary2);stop-opacity:.55"/><stop offset="1" style="stop-color:var(--primary2);stop-opacity:0"/></radialGradient>
      </defs>
      <ellipse cx="330" cy="260" rx="290" ry="200" fill="url(#halo)" opacity=".5"/>
      <ellipse cx="320" cy="440" rx="300" ry="34" style="fill:var(--desk)"/>

      <!-- floating chips -->
      <g class="p-float"><rect x="90" y="40" width="74" height="74" rx="18" style="fill:var(--chip-bg);stroke:var(--chip-line)" stroke-width="1.5"/>
        <g style="stroke:var(--chip-ico)" fill="none" stroke-width="3" stroke-linejoin="round" transform="translate(104 56)"><path d="M3 6h18v32H3zM27 6h18v32H27z" transform="translate(-1 0)"/><path d="M8 14h9M8 20h9M8 26h9M32 14h9M32 20h9M32 26h9" stroke-width="2"/></g></g>
      <g class="p-float p-b"><rect x="440" y="30" width="72" height="84" rx="18" style="fill:var(--chip-bg);stroke:var(--chip-line)" stroke-width="1.5"/>
        <g style="stroke:var(--chip-ico)" fill="none" stroke-width="3" stroke-linecap="round" transform="translate(458 46)"><path d="M18 4a14 14 0 0 0-7 26v5h14v-5A14 14 0 0 0 18 4z"/><path d="M12 42h12M15 38v-8M21 38v-8M15 30l3-5 3 5" stroke-width="2.4"/></g></g>
      <g class="p-float p-c"><path d="M345 18l40 16-40 16-40-16z" style="fill:var(--cap)"/><path d="M325 46v14q20 9 40 0V46l-20 8z" style="fill:var(--cap2)"/></g>
      <g class="p-float p-b"><rect x="14" y="290" width="76" height="76" rx="18" style="fill:var(--chip-bg);stroke:var(--chip-line)" stroke-width="1.5"/><path d="M42 312l24 16-24 16z" style="fill:var(--chip-ico)"/></g>

      <!-- laptop -->
      <g transform="rotate(-6 300 250)">
        <rect x="150" y="105" width="300" height="205" rx="16" style="fill:var(--bezel)"/>
        <rect x="160" y="115" width="280" height="185" rx="8" fill="url(#scr)"/>
        <circle cx="300" cy="208" r="62" fill="none" style="stroke:var(--primary2)" stroke-opacity=".45" stroke-width="2"/>
        <circle cx="300" cy="208" r="50" fill="#ffffff" fill-opacity=".08"/>
        <image href="__MARK__" x="250" y="158" width="100" height="100"/>
        <path d="M120 322h360l20 22H100z" style="fill:var(--base)"/>
        <rect x="100" y="344" width="400" height="9" rx="4" style="fill:var(--bezel)"/>
        <g style="stroke:var(--key)" stroke-width="5" stroke-linecap="round"><path d="M140 331h320M134 337h332"/></g>
        <rect x="270" y="338" width="60" height="4" rx="2" style="fill:var(--bezel)" opacity=".4"/>
      </g>

      <!-- books -->
      <g>
        <rect x="42" y="380" width="250" height="44" rx="6" style="fill:var(--book2)"/>
        <rect x="52" y="388" width="238" height="28" rx="3" style="fill:var(--page)"/>
        <path d="M60 396h220M60 404h220M60 411h220" style="stroke:var(--key)" stroke-width="1.5" opacity=".5"/>
        <rect x="42" y="378" width="30" height="46" rx="6" style="fill:var(--book1)"/>
        <rect x="70" y="340" width="220" height="42" rx="6" style="fill:var(--book1)"/>
        <rect x="80" y="348" width="208" height="26" rx="3" style="fill:var(--page)"/>
        <path d="M88 356h190M88 364h190" style="stroke:var(--key)" stroke-width="1.5" opacity=".5"/>
        <rect x="70" y="338" width="26" height="44" rx="6" style="fill:var(--book2)"/>
        <rect x="92" y="306" width="180" height="36" rx="5" style="fill:var(--book3)"/>
        <rect x="108" y="318" width="70" height="12" rx="3" style="fill:var(--page)" opacity=".85"/>
      </g>

      <!-- plant -->
      <g>
        <path d="M118 306q-8-60 8-110" fill="none" style="stroke:var(--leaf2)" stroke-width="5" stroke-linecap="round"/>
        <path d="M126 200q-50-4-62-44 40-4 62 44z" style="fill:var(--leaf1)"/>
        <path d="M126 200q42-30 76-8-20 34-76 8z" style="fill:var(--leaf2)"/>
        <path d="M122 250q-44 4-64-26 36-14 64 26z" style="fill:var(--leaf2)"/>
        <path d="M120 240q40-20 70 4-26 28-70-4z" style="fill:var(--leaf1)"/>
        <path d="M126 196q-6-34 22-58 12 34-22 58z" style="fill:var(--leaf1)"/>
        <path d="M84 296h72l-9 40h-54z" style="fill:var(--pot)"/>
        <rect x="80" y="288" width="80" height="14" rx="5" style="fill:var(--pot)"/>
      </g>

      <!-- pen cup -->
      <g>
        <rect x="474" y="190" width="9" height="90" rx="4" transform="rotate(-8 478 235)" fill="#ff9d1c"/>
        <rect x="492" y="180" width="9" height="100" rx="4" transform="rotate(4 496 230)" style="fill:var(--page)"/>
        <rect x="508" y="196" width="9" height="84" rx="4" transform="rotate(14 512 238)" fill="#ff5a5f"/>
        <path d="M462 260h72l-8 90q-1 10-12 10h-32q-11 0-12-10z" style="fill:var(--cup)"/>
        <path d="M470 276h56" stroke="#fff" stroke-opacity=".25" stroke-width="4" stroke-linecap="round"/>
      </g>
      <!-- notebook + pen -->
      <g transform="rotate(-8 480 380)"><rect x="400" y="368" width="150" height="40" rx="6" style="fill:var(--page)"/><path d="M412 368v40M424 368v40M436 368v40M448 368v40" style="stroke:var(--key)" stroke-width="2" opacity=".5"/><rect x="480" y="352" width="110" height="7" rx="3.5" style="fill:var(--bezel)"/></g>
    </svg>`
