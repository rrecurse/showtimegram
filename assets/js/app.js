// # Some global vars
let container = document.getElementById("container");
let message = document.getElementById("messages");
let modal = document.getElementById('modal');
let resultsDiv = document.getElementById("results");

// # load default dataset on page load
window.addEventListener('load', function() {
  init();
});

function init(query='*', page=1) {
  let searchData = new FormData();
  searchData.append('search', query);
  searchData.append('page', page);
  ajaxCall(searchData, 'process.php', 'POST');
}

window.onclick = function(e) {
    if (e.target == modal) {
      fadeOut(modal);
    }
};

document.addEventListener('click', function(e){

  let el = e.target;

  // # the submit upload image form selector
  if (el.matches('#upload')) {
    return uploadForm(e);
  }

  // # the modal open selector
  if (el.matches('.open')) {
    modalContent('upload');
    return fadeIn(modal);
  } 

  // # modal close selector
  if (el.matches('.close')) {
    return fadeOut(modal);
  }

  if(el.matches('#delete_cancel')) {
    return fadeOut(modal);
  }

  // # delete selector
  if (el.matches('.delete')) { 

    let id = el.parentElement.getAttribute('data-id');
    let filename = el.parentElement.getElementsByTagName("a")[0].href;
    filename = formatFilename(filename);
    fadeIn(modal);

    return deleteEntry(id, filename);
  }

  // # confirm delete selector
  if (el.matches('#delete_confirm')) {
    if(el.parentElement.getAttribute('data-id')) {
      let id = el.parentElement.getAttribute('data-id');
      return confirmDelete(id);
    } else {
      if(message.classList.contains('success')) {
        message.classList.remove('success');
      }
      message.classList.add("error");
      return message.innerHTML = 'Something went wrong with the deletion';
    }
  }

  // # upload form reset
  if(el.matches('#clear')) {
    return document.getElementById("image-form").reset();
  }

  // # paginate the results
  if(el.matches('#last-page') || el.matches('#next-page')) {

    e.preventDefault();

    // # clear the search field if set
    document.getElementById("search").reset();

    if(el.getAttribute('data-page')) {
      let page = el.getAttribute('data-page');
      return init('*', page);
    }
  }

  if(el.matches('.page')) {
    e.preventDefault();

    // # clear the search field if set
    document.getElementById("search").reset();

    // # ensure page number is an int
    if (Number.isInteger(parseInt(el.innerHTML))) {
      let page = el.innerHTML;
      return init('*', page);
    }

  }

}, false);

document.addEventListener('keyup', function(e){
 
  e.preventDefault();

  // # if escape key pressed, hide the modal
  if(e.key === "Escape") fadeOut(modal);

  let el = e.target;
  if (el.matches('#searchField')) {
    // # if value is null, show all
    if(el.value.length == 0) init();
    // # prevent lookup if less than 2 chars
    if(el.value.length > 1) init(el.value);
  }
}, false);


function ajaxCall(data, action, method) {

  let xhr = new XMLHttpRequest();
  let result='';

  xhr.onload = function(e) {

    let timeout = 5000;
    
    if(xhr.responseText) {

      let response = xhr.responseText;
      let jsonData = JSON.parse(response);

      if(jsonData.status == 'Error') {

        timeout = 15000; // # extend the error display timeout

        if(message.classList.contains('success')) {
          message.classList.remove('success');
        }
        message.classList.add("error");

        message.innerHTML = jsonData.status + ' - ' + jsonData.message;
        fadeOut(modal);

      } else if(jsonData.status == 'Update') {

        if(message.classList.contains('error')) {
          message.classList.remove('error');
        }
        message.classList.add("success");

        message.innerHTML = jsonData.status + ' - ' + jsonData.results;

        fadeOut(modal);
        init();

      } else if (jsonData.status == 'Success') {

        resultsDiv.innerHTML='';

        // # remove the NULL status div
        let NULLdiv = document.getElementById('noresults');
        if(NULLdiv) resultsDiv.removeChild(NULLdiv);

        let pagination = jsonData.results.find(function(el) {
          return el.pagination;
        });

        // # generate pagination
        paginate(pagination.pagination);

        if(typeof jsonData.results !== 'string') {
          // # unset the pagination row
          jsonData.results.splice( jsonData.results.indexOf('pagination') , 1);
          // # format the results object and inject into DOM.
          formatHTML(jsonData.results);
        }

        // # hide the modal if opened.
        fadeOut(modal);

        // # Clear the upload form.
        if(document.getElementById("image-form")) {
          document.getElementById("image-form").reset();
        }

      } else if(jsonData.status == 'OK') {

          resultsDiv.innerHTML='';
          let resultContentNULL = document.createElement("div");
          resultContentNULL.setAttribute('id', 'noresults');
          resultsDiv.appendChild(resultContentNULL);
          let resultContentNULLTxt = document.createTextNode(jsonData.results);
          resultContentNULL.appendChild(resultContentNULLTxt);

          // # clear the pagination div if exists
          if(document.getElementById('paginate')) {
            let paginate = document.getElementById('paginate');
            container.removeChild(paginate);
          }
      }

    }
    // # clear after timeout
    setTimeout(function() {
      message.innerHTML='';
      message.classList.remove("success");
      message.classList.remove("error");
    }, timeout);
  }

  xhr.onerror = function(){
      console.log('Error: Do something else...');
  }

  xhr.open(method, action, true);
  xhr.send(data);

  return 'success';
}

function paginate(pagination) {

  let page = pagination.current_page
  if(page < 1) page = 1;

  let max_results = pagination.max_results;
  let total_count = pagination.total_count;
  let last = pagination.last_page;
  let next = pagination.next_page;

  // # total number of possible pages
  let page_count = Math.ceil(total_count / max_results);

  if(total_count > 0) {

    // # only create the pagination control div on initial load
    if(!document.getElementById('paginate')) {
      let paginate = document.createElement("div");
      paginate.setAttribute('id', 'paginate');
      container.appendChild(paginate);
    }

    // # clear the controls on load
    paginate.innerHTML='';

    let paginateCtrls = "";

    if (page > 1) {
      paginateCtrls += '<a data-page="'+last+'" id="last-page">&lt;</a>';
    } else {
      paginateCtrls += '<a class="isDisabled">&lt;</a>';
    }

    // # alternative to show just page count and current page position
    //paginateCtrls += ' &nbsp; &nbsp; <b>Page '+page+' of '+page_count+'</b> &nbsp; &nbsp; ';

    // # create the page links based on row count
    for(var i=1; i <= page_count; i++){
      paginateCtrls += '<a class="page'+(page == i ? ' active' : '')+'">' + i + '</a> ';
    }

    if (next !== '') {
      paginateCtrls += '<a data-page="'+next+'" id="next-page">&gt;</a>';
    } else {
      paginateCtrls += '<a class="isDisabled">&gt;</a>';
    }

    document.getElementById('paginate').innerHTML = paginateCtrls;

  } else {

    // # remove the pagination div from DOM if exists
    if(document.getElementById('paginate')) {
      container.removeChild(document.getElementById('paginate'));
    }
  }
}

function uploadForm(e) {

  e.preventDefault();

  let theForm = document.getElementById("image-form");
  let action = theForm.getAttribute('action');
  let filename = document.querySelector('[type=file]').files;

  if(filename.length > 0) {
    let formData = new FormData(theForm);
    formData.append('filename', filename);
    formData.append("username", document.getElementsByName("username")[0].value);
    formData.append("caption",  document.getElementsByName("caption")[0].value);

    let result = ajaxCall(formData, action, 'POST');

    if(result == 'success') {
      init();
    }
    
  } else {
    message.classList.add("error");
    message.innerHTML = 'Error - No file specified.';
  }
}

function deleteEntry(id, filename='') {
  modalContent('confirm', id, filename);
}

function confirmDelete(id) {

  let image = document.querySelector('[data-id="'+id+'"]');
  let deleteData = new FormData();
  deleteData.append('id', id);

  fadeOut(image);
  // # intentionally jump to top of page to show messages
  window.scrollTo(0,0);

  ajaxCall(deleteData, 'process.php', 'POST');

  // # slight delay to allow the server to work
  setTimeout(function(){
    init();
  }, 200);
}

function formatFilename(filepath) {

  let filename = filepath.replace(/\\/g,'/').replace(/.*\//, '');
  let file = document.createElement('a');
  file.href = filename;
  // # the filename from path
  filename = file.pathname.substring(file.pathname.lastIndexOf('/') + 1);
  // # the unique ID from filename
  let uniqueID = file.pathname.substring(file.pathname.lastIndexOf("_"));
  // # the ext from filename
  let ext = file.pathname.substring(file.pathname.lastIndexOf("."));
  // # the new filename without unique ID or path
  let newname = filename.replace(uniqueID,'');
  // # sanity check to ensure ext is not already part of filename
  if(newname.indexOf(ext) === -1) {
    newname = newname + ext;
  }

  return newname;
}

function fadeIn(el, display) {
  el.style.opacity = 0;
  el.style.display = display || "block";

  // # prevent body scroll when modal is visible
  // # using fixed results in jump to top of page
  //document.body.style.position = 'fixed';
  document.body.style.overflowY = 'hidden';
  document.body.style.marginRight = '24px';
  document.body.style.width = (window.innerWidth - 36) +'px';

  // # if modal exists and has classList
  if(modal.firstElementChild) {
    let modalClasses = modal.firstElementChild.classList;
    if(modalClasses.contains('modal-close')) {
      modalClasses.remove('modal-close');
    }
  }
    
  (function fade() {
    let val = parseFloat(el.style.opacity);
    if (!((val += .1) > 1)) {
      el.style.opacity = val;
      requestAnimationFrame(fade);
    }
  })();
}

function fadeOut(el){

  el.style.opacity = 1;
  
  (function fade() {
    if ((el.style.opacity -= .1) < 0) {      
      el.style.display = "none";
      document.body.style.overflowY = 'auto';
      document.body.style.marginRight = '';

    } else {

      // # if modal is present and has classList
      if(modal.firstElementChild) {
        let modalClasses = modal.firstElementChild.classList;
        if(!modalClasses.contains('modal-close')) {
          modalClasses.add('modal-close');
        }
      }
      requestAnimationFrame(fade);
      // # slight delay to avoid clearing element too quickly
      setTimeout(function(){
        modal.innerHTML = ''
      }, 200);
    }
  })();
}

function formatHTML(jsonData) {

  for (var i = 0; i < jsonData.length; i++) {
 
    // # don't render row for total count used in pagination

    if(!jsonData[i].pagination) {
      let resultContent = document.createElement("DIV");
      resultContent.classList.add("image-block");
      resultContent.setAttribute('data-id', jsonData[i].id);

      resultsDiv.appendChild(resultContent);

      let resultContentHref = document.createElement("a");
      resultContentHref.setAttribute('href', jsonData[i].filename);
      resultContentHref.setAttribute('target', 'blank');

      resultContent.appendChild(resultContentHref);

      let resultContentImg = document.createElement("img");
      resultContentImg.setAttribute('src', jsonData[i].filename);
      resultContentHref.appendChild(resultContentImg);

      let resultContentUser = document.createElement("div");
      resultContentUser.classList.add("user");
      let resultContentUserTxt = document.createTextNode("by: " + jsonData[i].username);
      resultContentUser.appendChild(resultContentUserTxt);

      resultContent.appendChild(resultContentUser);

      let resultContentCaption = document.createElement("div");
      resultContentCaption.classList.add("caption");

      resultContent.appendChild(resultContentCaption);
      let resultContentCaptionTxt = document.createTextNode(jsonData[i].caption);
      // # to avoid complex html-entity decoding, innerHTML the caption
      //resultContentCaption.appendChild(resultContentCaptionTxt);
      resultContentCaption.innerHTML = jsonData[i].caption;

      let resultContentDelete = document.createElement("div");
      resultContentDelete.classList.add("delete");
      resultContent.appendChild(resultContentDelete);
      let resultContentDeleteTxt = document.createTextNode('Delete?');
      resultContentDelete.appendChild(resultContentDeleteTxt);
    }
  }
}

function modalContent(type, id='', filename='') {

  let title = (type =='upload' ? 'Upload Image' : 'Delete Image?');

  let modalContents = document.createElement("DIV");
  modalContents.classList.add("modal-content");

  // # modal header
  let modalHead = document.createElement("DIV");
  modalHead.classList.add("modal-header");

  modalContents.appendChild(modalHead);

  let modalHeadContent = document.createElement("SPAN");
  modalHeadContent.classList.add("close");
  modalHead.appendChild(modalHeadContent);

  modalHeadContent.innerHTML = "&times;";

  let modalHeadH3 = document.createElement("H3");

  let modalHeadText = document.createTextNode(title);
  modalHeadH3.appendChild(modalHeadText);
  modalHead.appendChild(modalHeadH3);

  // # modal body
  let modalBody = document.createElement("DIV");
  modalBody.classList.add("modal-body");

  if(type =='upload') {

    modalBody.setAttribute('style', 'height:100% !important');
    modalBody.setAttribute('data-id', id);

    let spacer = document.createElement("BR");

    modalContents.appendChild(modalBody);

    // # create the form
    let uploadForm = document.createElement("FORM");
    uploadForm.setAttribute('id', 'image-form');
    uploadForm.setAttribute('action', 'process.php');
    uploadForm.setAttribute('method', 'post');
    uploadForm.setAttribute('enctype', 'multipart/form-data');
    modalBody.appendChild(uploadForm);

    // # username
    let usernameLabel = document.createElement("label");
    usernameLabel.setAttribute('for', 'username');
    uploadForm.appendChild(usernameLabel);

    let usernameLabelText = document.createTextNode("Enter your Name:");
    usernameLabel.appendChild(usernameLabelText);

    let username = document.createElement("input");
    username.setAttribute('type', 'text');
    username.setAttribute('title', 'Username');
    username.setAttribute('placeholder', 'Username');
    username.setAttribute('name', 'username');
    username.setAttribute('value', '');
    username.setAttribute('required', 'required');

    usernameLabel.appendChild(username);

    uploadForm.appendChild(spacer);

    // # caption
    let captionLabel = document.createElement("label");
    captionLabel.setAttribute('for', 'caption');
    uploadForm.appendChild(captionLabel);

    let captionLabelText = document.createTextNode("Enter Image Caption:");
    captionLabel.appendChild(captionLabelText);

    let caption = document.createElement("TEXTAREA");
    caption.setAttribute('name', 'caption');
    caption.setAttribute('required', 'required');

    captionLabel.appendChild(caption);

    uploadForm.appendChild(spacer.cloneNode(true));

    // # files
    let filesLabel = document.createElement("label");
    filesLabel.setAttribute('for', 'files[]');
    uploadForm.appendChild(filesLabel);

    let filesLabelText = document.createTextNode("Select Image to Upload:");
    filesLabel.appendChild(filesLabelText);

    let files = document.createElement("input");
    files.setAttribute('type', 'file');
    files.setAttribute('name', 'files[]');
    files.setAttribute('id', 'fileInput');
    files.setAttribute('required', 'required');

    filesLabel.appendChild(files);

    let submit = document.createElement("input");
    submit.setAttribute('type', 'submit');
    submit.setAttribute('value', 'Upload');
    submit.setAttribute('id', 'upload');

    uploadForm.appendChild(submit);

    let reset = document.createElement("DIV");
    reset.setAttribute('id', 'clear');

    let resetText = document.createTextNode("Reset");
    reset.appendChild(resetText);

    uploadForm.appendChild(reset);

  } else if(type =='confirm') {

    modalBody.setAttribute('style', 'height:90px');
    modalBody.setAttribute('data-id', id);
    modalContents.appendChild(modalBody);

    let modalDelete = document.createElement("SPAN");
    modalDelete.classList.add("delete_question");

    let modalDeleteConfirm = document.createTextNode("Are you sure you want to delete image?");
    modalDelete.appendChild(modalDeleteConfirm);

    modalBody.appendChild(modalDelete);

    let spacer = document.createElement("BR");

    modalBody.appendChild(spacer);
    modalBody.appendChild(spacer.cloneNode(true));

    let modalDeleteFilename = document.createElement("DIV");
    modalDeleteFilename.classList.add("delete_filename");
    modalBody.appendChild(modalDeleteFilename);

    let modalDeleteFilenameTxt = document.createTextNode(filename);
    modalDeleteFilename.appendChild(modalDeleteFilenameTxt);

    modalBody.appendChild(spacer.cloneNode(true));
    modalBody.appendChild(spacer.cloneNode(true));

    let modalDeleteButtonCancel = document.createElement("BUTTON");
    modalDeleteButtonCancel.classList.add("button");
    modalDeleteButtonCancel.setAttribute('id', 'delete_cancel');
    let modalDeleteButtonCancelTxt = document.createTextNode('Cancel');
    modalDeleteButtonCancel.appendChild(modalDeleteButtonCancelTxt);

    modalBody.appendChild(modalDeleteButtonCancel);

    let modalDeleteButtonConfirm = document.createElement("BUTTON");
    modalDeleteButtonConfirm.classList.add("button");
    modalDeleteButtonConfirm.setAttribute('id','delete_confirm');
    let modalDeleteButtonConfirmTxt = document.createTextNode('Delete');
    modalDeleteButtonConfirm.appendChild(modalDeleteButtonConfirmTxt);

    modalBody.appendChild(modalDeleteButtonConfirm);
  }

  // # hide the modal footer on delete confirm
  if(type != 'confirm') {
    // # modal footer
    let modalFoot = document.createElement("DIV");
    modalFoot.classList.add("modal-footer");
    modalContents.appendChild(modalFoot);

    let modalFootContent = document.createElement("SPAN");
    modalFoot.appendChild(modalFootContent);

    let modalFootText = document.createTextNode("Accepted file formats include JPG, PNG and GIF");
    modalFootContent.appendChild(modalFootText);

    let modalFootLogo = document.createElement("DIV");
    modalFootLogo.setAttribute('id', 'showlogo');
    modalFoot.appendChild(modalFootLogo);
  }
    // # finally, append everything to main modal element
    modal.appendChild(modalContents);
}