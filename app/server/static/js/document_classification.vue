<template lang="pug">
  extends ./annotation.pug

  block annotation-area
    div.card
      header.card-header
        div.card-header-title.has-background-royalblue
          div.field.is-grouped.is-grouped-multiline
            <tags-input @tag-added="addLabel" @tag-removed="deleteLabel" element-id="tags" placeholder="" typeahead-style="dropdown" :existing-tags="existingTags" :typeahead="true"></tags-input>

      div.card-content
        div.field.is-grouped.is-grouped-multiline

        hr
        div.content(v-if="docs[pageNumber]")
          span.text {{ docs[pageNumber].text }}
</template>

<style scoped>
  hr {
    margin: 0.8rem 0;
  }

  .card-header-title {
    padding: 1.5rem;
  }
</style>

<script>
  import {annotationMixin} from './mixin';
  import HTTP from './http';
  import {simpleShortcut} from './filter';
  import AutoCompleteTags from './autocomplete_tags.vue';
  import EventBus from './bus'

  export default {
    filters: {simpleShortcut},
    components: {
      'tags-input': {
        mixins: [AutoCompleteTags],
        mounted() {
          let tagsInput = this;
          EventBus.$on('ADD_TAG', function(label) {
            tagsInput.addTag(JSON.stringify(label), label.text, true)
          });
          EventBus.$on('CLEAR_TAGS', function(label) {
            tagsInput.clearTags()
          });
        },
      },

    },
    skipEvents:true,
    mixins: [annotationMixin],
    methods: {
      isIn(label) {
        for (let i = 0; i < this.annotations[this.pageNumber].length; i++) {
          const a = this.annotations[this.pageNumber][i];
          if (a.label === label.id) {
            return a;
          }
        }
        return false;
      },

      async submit() {
        const state = this.getState();
        this.url = `docs?q=${this.searchQuery}&doc_annotations__isnull=${state}&offset=${this.offset}`;
        await this.search();
        this.pageNumber = 0;
      },

      async deleteLabel(labelObj, text) {
        const label = JSON.parse(labelObj);
        for (let annotation of this.annotations[this.pageNumber]) {
          if (parseInt(label.id) === parseInt(annotation.label)) {
            this.removeLabel(annotation)
          }
        }
      },

      setAnnotations() {
        EventBus.$emit('CLEAR_TAGS');
        if(this.annotations[this.pageNumber]){
          for (let annotation of this.annotations[this.pageNumber]) {
            this.labels.find((a) => {
              if(parseInt(a.id) === parseInt(annotation.label)){
                EventBus.$emit('ADD_TAG', a);
              }
            });
          }
        }
      },

      setTags() {
        let tags = {};
        for (let label of this.labels) {
          tags[JSON.stringify(label)] = label.text;
        }
        this.existingTags = tags;
      },

      async addLabel(labelObj, text) {
        const label = JSON.parse(labelObj);
        const a = this.isIn(label);
        if (a) {
          this.removeLabel(a);
        } else {
          const docId = this.docs[this.pageNumber].id;
          const payload = {
            label: label.id,
          };
          await HTTP.post(`docs/${docId}/annotations`, payload).then((response) => {
            this.annotations[this.pageNumber].push(response.data);
          });
        }
      },
    },
  };
</script>
