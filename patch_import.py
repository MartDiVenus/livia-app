import re
with open("src/components/AuxiliaryKeyboard.tsx", "r") as f:
    content = f.read()

content = content.replace("import React, { useRef } from 'react';", "import React, { useRef, useState, useEffect } from 'react';")

with open("src/components/AuxiliaryKeyboard.tsx", "w") as f:
    f.write(content)
