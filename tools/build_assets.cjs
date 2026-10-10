// Source files stay readable; HTML loads these generated compact assets.
// Build dependency: Terser 5.51.2 browser bundle in .workbuddy/build-tools/terser.min.js.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..');
const context = {}; vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'.workbuddy/build-tools/terser.min.js'),'utf8'),context);
// Strip comments and compact outside quoted CSS strings. Keep selector spaces,
// calc operator spaces, declaration order, and modern syntax unchanged.
function compactCss(source) {
  let output='', i=0, pending=false;
  while(i<source.length) {
    const c=source[i];
    if(c==='/' && source[i+1]==='*') {
      const end=source.indexOf('*/',i+2);if(end<0)throw Error('Unclosed CSS comment');
      pending=true;i=end+2;continue;
    }
    if(/\s/.test(c)){pending=true;i++;continue;}
    if(pending && output && !/[{};,]/.test(c) && !/[{};,]$/.test(output))output+=' ';
    pending=false;
    if(c==='"'||c==="'") {
      const quote=c;output+=c;i++;
      while(i<source.length){const next=source[i++];output+=next;if(next==='\\'&&i<source.length)output+=source[i++];else if(next===quote)break;}
    } else {output+=c;i++;}
  }
  return output.trim();
}
(async()=>{
  for(const name of ['main','i18n','install','install-copy']) {
    const source=fs.readFileSync(path.join(root,name+'.js'),'utf8');
    const result=await context.Terser.minify(source,{compress:true,mangle:true,format:{comments:false},safari10:true});
    fs.writeFileSync(path.join(root,name+'.min.js'),result.code+'\n');
    console.log(name+'.js',Buffer.byteLength(source),'->',Buffer.byteLength(result.code));
  }
  for(const name of ['style','install']) {
    const source=fs.readFileSync(path.join(root,name+'.css'),'utf8'),result=compactCss(source);
    fs.writeFileSync(path.join(root,name+'.min.css'),result+'\n');
    console.log(name+'.css',Buffer.byteLength(source),'->',Buffer.byteLength(result));
  }
})();
