var gh=new Github({auth:'oauth',token:'b93365cb0876e6bf85728f3a10e2bab3384d428a'});//give personal access to repo, well repo is public anyways
var repo=gh.getRepo('whoisterencelee','wordsharer.com');

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

function start(){
	repo.getRef("heads/gh-pages",function(e,sha){});
	//save the HEAD of gh-pages
	//use HEAD to get file
	//
}
