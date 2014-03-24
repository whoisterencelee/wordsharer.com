// wordsharer.js - speedy, concise, propagate. Frictionless idea sharing powered by GitHub.
// Copyright (c) 2014, Terence Lee
// https://github.com/whoisterencelee/wordsharer.com.git

// requires:
// marked.js		https://github.com/chjj/marked.git
// github.js		https://github.com/whoisterencelee/github.git
//  underscore.js
//  base64.js
// htmlDiff		https://github.com/cosmiclattes/htmlDiff.git
//  google-diff-match-patch

function wordsharer(words){

	gh=new Github({auth:'oauth',token:'b93365cb0876e6bf85728f3a10e2bab3384d428a'});//give personal access to repo, well repo is public anyways
	repo=gh.getRepo('whoisterencelee','wordsharer.com');
	C=document.getElementById('content');
	getWords(words,function(text){C.innerHTML=text;});
}

function save(){
	
	repo.write('gh-pages','why.md',C.innerHTML,"commit changes to why.md",function(err){console.log(err)});

	//OT version
	//diff the original md with current to get the client insert operation(s)
		//if content is removed, insert ~~strikeover~~ to convert to insert operation

	//grab the server insert operation from github, using something like git compare
		//save the current HEAD

	//transform the client insert operation and merge into the latest document
	//commit
		//if successful save the current HEAD
		//otherwise try from grab the 
}

function getlatest(cb){
	repo.read('gh-pages','why.md',cb);
	// function(err, data) {});

}

var DOCHEAD="";
var ORIGHTML="";

function getWords(file,cb){

	//get last commit for file
	repo.getCommits({path:file,sha:"heads/gh-pages"},function(e,commits){
		if(e)return cb(errorlog("Unable to find last commit for "+file,e));
		var lastcommit=commits[0];

		//compare last commit sha with DOCHEAD if different/none than continue
		if(lastcommit.sha==DOCHEAD)return ORIGHTML;

		DOCHEAD=lastcommit.sha;
		
		//use lastcommit to get file
		repo.req("GET",lastcommit.commit.tree.url,null,function(e,tree){
			if(e)return cb(errorlog("Unable to find tree for commit "+lastcommit.sha,e));
			
			var blobobj = _.select(tree, function(fileobj){return fileobj.path === file;})[0];

			repo.req("GET",blobobj.url,null,function(e,filecontent){
				if(e)return cb(errorlog("Unable to get file content of "+file+" @ commit "+lastcommit.sha,e));
				
				//put md thur markdown, because we are only working with HTML
				//save html as original version

				ORIGHTML=marked(filecontent);
				cb(null,ORIGHTML);

			},'raw');
		});
	});
}

function merge(){
	//merge original into current to re-instate deleted
	//getWords and merge in
	//insert time modify attribute to all ins and del that doesn't already have this attribute
}

function errorlog(heading,details){
	console.log("ERROR: "+heading+" : "+details);
	return "<H1>"+heading+"</H1><P>"+details+"</P>";
}
