import re
with open("src/components/AuxiliaryKeyboard.tsx", "r") as f:
    content = f.read()

content = content.replace("import React from 'react';", "import React, { useState, useEffect } from 'react';")

with open("src/components/AuxiliaryKeyboard.tsx", "w") as f:
    f.write(content)
