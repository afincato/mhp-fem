const colorArray = ['006DFF', 'FF1D3B', '00DF1D', 'FFB500', 'AD1ED7'];
const thumbArray = document.querySelectorAll('.match > .thumb');

Array.from(thumbArray).forEach(function(thumb, ind) {
    thumb.style.backgroundColor = '#' + colorArray[Math.floor(Math.random() * colorArray.length)];
});