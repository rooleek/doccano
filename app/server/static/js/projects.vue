<template>
  <div v-cloak>
    <section class="hero project-image">
      <div class="container">
        <div class="columns">
          <div class="column is-10 is-offset-1">
            <h1 class="title is-1 has-text-white">
              Hello, {{ username | title }}.
            </h1>
            <h2 class="subtitle is-4 has-text-white">
              I hope you are having a great day!
            </h2>
            <p v-if="isSuperuser">
              <a @click="isActive=!isActive" class="button is-medium is-primary">
                Create Project
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Modal card for creating project. -->
    <div :class="{ 'is-active': isActive }" class="modal">
      <div class="modal-background"/>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">
            Create Project
          </p>
          <button @click="isActive=!isActive" aria-label="close" class="delete"/>
        </header>
        <section class="modal-card-body">
          <div class="field">
            <label class="label">
              Project Name
            </label>
            <div class="control">
              <input class="input" placeholder="Project name" required type="text"
                     v-model="projectName"
              >
            </div>
            <p class="help is-danger">
              {{ projectNameError }}
            </p>
          </div>
          <div class="field">
            <label class="label">Description</label>
            <div class="control">
              <textarea class="textarea" placeholder="Project description" required
                        v-model="description"
              />
            </div>
            <p class="help is-danger">
              {{ descriptionError }}
            </p>
          </div>
          <div class="field">
            <label class="label">
              Project Type
            </label>
            <div class="control">
              <select name="project_type" required v-model="projectType">
                <option selected="selected" value="">
                  ---------
                </option>
                <option value="DocumentClassification">
                  document classification
                </option>
                <option value="SequenceLabeling">
                  sequence labeling
                </option>
                <option value="Seq2seq">
                  sequence to sequence
                </option>
              </select>
            </div>
            <p class="help is-danger">
              {{ projectTypeError }}
            </p>
          </div>
        </section>
        <footer class="modal-card-foot pt20 pb20 pr20 pl20 has-background-white-ter">
          <button @click="create()" class="button is-primary">
            Create
          </button>
          <button @click="isActive=!isActive" class="button">
            Cancel
          </button>
        </footer>
      </div>
    </div>

    <div :class="{ 'is-active': isDelete }" class="modal">
      <div class="modal-background"/>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">
            Delete Project
          </p>
          <button @click="isDelete=!isDelete" aria-label="close" class="delete"/>
        </header>
        <section class="modal-card-body">
          Are you sure you want to delete project?
        </section>
        <footer class="modal-card-foot pt20 pb20 pr20 pl20 has-background-white-ter">
          <button @click="deleteProject()" class="button is-danger">
            Delete
          </button>
          <button @click="isDelete=!isDelete" class="button">
            Cancel
          </button>
        </footer>
      </div>
    </div>

    <section class="hero">
      <div class="container">
        <div class="columns">
          <div class="column is-10 is-offset-1">
            <div class="card events-card">
              <header class="card-header">
                <p class="card-header-title">
                  {{ items.length }} Projects
                </p>
                <div class="field card-header-icon">
                  <div class="control">
                    <div class="select">
                      <select v-model="selected">
                        <option selected>
                          All Project
                        </option>
                        <option>
                          Text Classification
                        </option>
                        <option>
                          Sequence Labeling
                        </option>
                        <option>
                          Seq2seq
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              </header>
              <div class="card-table">
                <div class="content">
                  <table class="table is-fullwidth">
                    <tbody>
                    <tr :key="project.id" v-for="project in selectedProjects">
                      <td class="pl15r">
                        <div class="thumbnail-wrapper is-vertical">
                          <img :src="project.image" class="project-thumbnail">
                        </div>
                        <div class="dataset-item__main is-vertical">
                          <div class="dataset-item__main-title">
                            <div class="dataset-item__main-title-link dataset-item__link">
                              <a :href="'/projects/' + project.id" class="has-text-black">
                                {{ project.name }}
                              </a>
                            </div>
                          </div>
                          <div class="dataset-item__main-subtitle">
                            {{ project.description }}
                          </div>
                          <div class="dataset-item__main-info">
                              <span class="dataset-item__main-update">
                                updated <span>{{ project.updated_at | daysAgo }}</span>
                              </span>
                          </div>
                        </div>
                      </td>
                      <td class="is-vertical">
                        <span class="tag is-normal">{{ project.project_type }}</span>
                      </td>
                      <td class="is-vertical" v-if="isSuperuser">
                        <a :href="'/projects/' + project.id + '/docs'">Edit</a>
                      </td>
                      <td class="is-vertical" v-if="isSuperuser">
                        <a @click="setProject(project)" class="has-text-danger">Delete</a>
                      </td>
                    </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
  import axios from 'axios';
  import {title, daysAgo} from './filter';

  axios.defaults.xsrfCookieName = 'csrftoken';
  axios.defaults.xsrfHeaderName = 'X-CSRFToken';
  const baseUrl = window.location.href.split('/').slice(0, 3).join('/');

  export default {
    filters: {title, daysAgo},

    data: () => ({
      items: [],
      isActive: false,
      isDelete: false,
      project: null,
      selected: 'All Project',
      projectName: '',
      description: '',
      projectType: '',
      descriptionError: '',
      projectTypeError: '',
      projectNameError: '',
      username: '',
      isSuperuser: false,
    }),

    computed: {
      selectedProjects() {
        return this.items.filter(item => this.selected === 'All Project' || this.matchType(item.project_type));
      },
    },

    created() {
      Promise.all([
        axios.get(`${baseUrl}/v1/projects`),
        axios.get(`${baseUrl}/v1/me`),
      ]).then(([projects, me]) => {
        this.items = projects.data;
        this.username = me.data.username;
        this.isSuperuser = me.data.is_superuser;
      });
    },

    methods: {
      deleteProject() {
        axios.delete(`${baseUrl}/v1/projects/${this.project.id}`).then(() => {
          this.isDelete = false;
          const index = this.items.indexOf(this.project);
          this.items.splice(index, 1);
        });
      },

      setProject(project) {
        this.project = project;
        this.isDelete = true;
      },

      matchType(projectType) {
        if (projectType === 'DocumentClassification') {
          return this.selected === 'Text Classification';
        }
        if (projectType === 'SequenceLabeling') {
          return this.selected === 'Sequence Labeling';
        }
        if (projectType === 'Seq2seq') {
          return this.selected === 'Seq2seq';
        }
        return false;
      },

      create() {
        const payload = {
          name: this.projectName,
          description: this.description,
          project_type: this.projectType,
          guideline: 'Please write annotation guideline.',
          resourcetype: this.resourceType(),
        };
        axios.post(`${baseUrl}/v1/projects`, payload).then((response) => {
          window.location = `${baseUrl}/projects/${response.data.id}/docs/create`;
        }).catch((error) => {
          this.projectTypeError = '';
          this.projectNameError = '';
          this.descriptionError = '';
          if ('resourcetype' in error.response.data) {
            this.projectTypeError = error.response.data.resourcetype;
          }
          if ('name' in error.response.data) {
            this.projectNameError = error.response.data.name[0];
          }
          if ('description' in error.response.data) {
            this.descriptionError = error.response.data.description[0];
          }
        });
      },

      resourceType() {
        if (this.projectType === 'DocumentClassification') {
          return 'TextClassificationProject';
        }
        if (this.projectType === 'SequenceLabeling') {
          return 'SequenceLabelingProject';
        }
        if (this.projectType === 'Seq2seq') {
          return 'Seq2seqProject';
        }
        return '';
      },
    },
  };
</script>
